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
};