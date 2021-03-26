var { MongoClient } = require('mongodb');
var bcrypt = require('bcrypt');
var url = 'mongodb+srv://hharis:Laptop123@cluster0.gm7jn.mongodb.net/cps88?retryWrites=true&w=majority';


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

async function register(username, password) {
    var conn = await connect();
    var existingUser = await conn.collection('users').findOne({ username });

    if (existingUser != null) {
        throw new Error('User already exists!');
    }
    var SALT_ROUNDS = 10;
    var passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    await conn.collection('users').insertOne({ username, passwordHash });
}

async function login(username, password) {
    var conn = await connect();
    var user = await conn.collection('users').findOne({ username });

    if (user == null) {
        throw new Error('User does not exist!');
    }

    var valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
        throw new Error('Invalid Password!');
    }

    console.log('Login was successful!');
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

module.exports = {
    url,
    login,
    register,
    getListItems,
    addListItem,
    deleteListItems,
}