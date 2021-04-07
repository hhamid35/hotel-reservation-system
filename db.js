const dotenv = require('dotenv');
dotenv.config();
var { MongoClient } = require('mongodb');
var { ObjectId } = require('mongodb');
var bcrypt = require('bcrypt');
const { request } = require('express');
var url = process.env.MONGODB_URI;


var db = null;
async function connect() {
    if (db == null) {
        var options = {
            useUnifiedTopology: true,
        };

        var connection = await MongoClient.connect(url, options);
        db = await connection.db('cps888');
    }
    
    return db;
}

async function register(name, email, username, password, phone, street, city, postalCode, country) {
    var conn = await connect();
    var existingUser = await conn.collection('users').findOne({ 'account.username': username });

    if (existingUser != null) {
        throw new Error('User already exists!');
    }
    var SALT_ROUNDS = 10;
    var passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    
    await conn.collection('users').insertOne({ 
        'name': name,
        'email': email,
        'phone': phone,
        'accountType': 'Guest',
        'account': {
            'username': username,
            'passwordHash': passwordHash,
            'status': 'Active'
        },
        'address': {
            'street': street,
            'city': city,
            'postalCode': postalCode,
            'country': country
        }
    });
}

async function login(username, password) {
    var conn = await connect();
    var user = await conn.collection('users').findOne({ 'account.username': username });

    if (user == null) {
        throw new Error('User does not exist!');
    }

    var valid = await bcrypt.compare(password, user.account.passwordHash);

    if (!valid) {
        throw new Error('Invalid Password!');
    }

    console.log('Login was successful!');
}

async function getUser(username) {
    var conn = await connect();
    var user = await conn.collection('users').findOne({ 'account.username': username });

    if (user == null) {
        throw new Error('User does not exist!');
    }

    delete user.passwordHash;
    return user;
}

async function getAccountType(username) {
    var conn = await connect();
    var user = await conn.collection('users').findOne({ 'account.username': username });

    if (user == null) {
        throw new Error('User does not exist!');
    }

    return user.accountType;
}

async function requestSystemAccess(username, accessCode) {
    var conn = await connect();
    var user = await conn.collection('users').findOne({ 'account.username': username });

    if (user == null) {
        throw new Error('User does not exist!');
    }

    var request = await conn.collection('systemRequests').findOne({ user });

    if (request == null) {
        await conn.collection('systemRequests').insertOne({
            'username': user.account.username,
            'name': user.name,
            'accessCode': accessCode,
            'status': 'Pending',
        });
    }
    else {
        throw new Error('A request under this account already exists!');
    }
}

async function grantSystemAccess(requestID) {
    var o_id = ObjectId(requestID);
    var conn = await connect();
    var request = await conn.collection('systemRequests').findOne({ '_id': o_id });

    if (request == null) {
        throw new Error('Request does not exist!');
    }

    await conn.collection('users').updateOne(
        { 'account.username': request.username },
        { $set: { 'accountType': 'Manager' } }
    );

    await conn.collection('systemRequests').updateOne(
        { '_id': request._id },
        { $set: { 'status': 'Granted' } }
    );
}

async function rejectSystemAccess(requestID) {
    var o_id = ObjectId(requestID);
    var conn = await connect();
    var request = await conn.collection('systemRequests').findOne({ '_id': o_id });

    if (request == null) {
        throw new Error('Request does not exist!');
    }

    await conn.collection('systemRequests').updateOne(
        { '_id': request._id },
        { $set: { 'status': 'Rejected' } }
    );
}

async function getSystemAccessRequests() {
    var conn = await connect();
    var requests = await conn.collection('systemRequests').find({ 'status': 'Pending' }).toArray();

    if (requests == null) {
        throw new Error('No requests found');
    }

    return requests;
}

async function addListItem(username, item) {
    var conn = await connect();

    await conn.collection('users').updateOne(
        { username },
        {
            $push: {
                list: item,
            }
        }
    );
}

async function getListItems(username) {
    var conn = await connect();
    var user = await conn.collection('users').findOne({ username });

    return  user.list;
}

async function deleteListItems(username, item) {
    var conn = await connect();

    await conn.collection('users').updateOne(
        { username },
        {
            $pull: {
                list: item,
            }
        }
    );
}

async function getRoomByID(id) {
    var conn = await connect();
    var room = await conn.collection('rooms').find({ roomNumber: id }).toArray();
    
    if (room == null) {
        throw new Error('Room does not exist!');
    }
    
    return room;

}

async function getRoom(price_min, price_max, start_date, end_date) {    
    
    var conn = await connect();
    
    if((start_date=="" && end_date=="") && (price_min == "" && price_max==""))
        return(await conn.collection('rooms').find({}).toArray());

    if((start_date!="" && end_date!="") && (price_min == "" && price_max=="")){
        price_min=0;
        const max = 5000;
        price_max = max;
    }

    var selected_start = new Date(start_date);
    var selected_end = new Date(end_date);

    if(selected_start>selected_end)
        throw new Error('CheckOut must be after CheckIn!');

    var room = await conn.collection('rooms').find({ 
        'price': { $gte: parseInt(price_min), $lte: parseInt(price_max)}
    }).toArray();

    if (room == null) {
        throw new Error('Room does not exist!');
    }
    if(start_date != "" && end_date != ""){
        var reservation;
        var res_array = [];
        for(var i = 0;i<room.length;i++){
            reservation = await conn.collection('reservation').find({
                'room': room[i]._id 
            }).toArray();
            if(reservation[0] != null)
                res_array.push(reservation[0]);
        }
        if(res_array != null){
            for(i = 0;i<res_array.length;i++){
                var start = res_array[i].checkIn;  //x>y, x later than y
                var end = res_array[i].checkOut; 
                if(!((selected_start < start && selected_end < start) || (selected_start > end && selected_end > end))){       
                    //s_start and s_end must be outside of the range
                    room.splice(i,1);
                }    
            }
        }
    }
    return room;
}

async function create_reservation(resNo, resDate, duration, checkin, checkout, room_id, guest_id, payment) {
    await conn.collection('reservation').insertOne({ 
        'reservationNumber': resNo,
        'resrevationDate': resDate,
        'duration': duration,
        'CheckIn': checkin,
        'Checkout': checkout,
        'status': 'confirmed',
        'notifications':'',
        'room': room_id,
        'guest': guest_id,
        'payment': ''
    });
}

async function createAdminUser() {
    var conn = await connect();
    var existingUser = await conn.collection('users').findOne({ 'account.username': 'admin' });

    if (existingUser == null) {    
        var SALT_ROUNDS = 10;
        var passwordHash = await bcrypt.hash('admin', SALT_ROUNDS)
        
        await conn.collection('users').insertOne({ 
            'name': 'admin',
            'email': 'admin@admin.com',
            'phone': '1111111111',
            'accountType': 'Admin',
            'account': {
                'username': 'admin',
                'passwordHash': passwordHash,
                'status': 'Active'
            },
            'address': {
                'street': '350 Victoria Street',
                'city': 'Toronto',
                'postalCode': 'M5B2K3',
                'country': 'Canada'
            }
        });
    }
}
createAdminUser();

module.exports = {
    url,
    login,
    register,
    getAccountType,
    getUser,
    requestSystemAccess,
    grantSystemAccess,
    rejectSystemAccess,
    getSystemAccessRequests,
    getRoom,
    getRoomByID
};