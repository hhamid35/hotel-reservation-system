const { ObjectID } = require('bson');
var express = require('express');
var router = express.Router();
var db = require('../db');

router.get('/login', async function(req, res) {
  res.render('login', { title: 'Login' } );
});

router.get('/register', async function(req, res) {
  res.render('register', { title: 'Register' } );
});

router.post('/login', async function(req, res) {
  var { username, password, register } = req.body;

  if (register) {
    res.redirect('/register');
  } 
  else {
    await db.login(username, password);
    req.session.username = username;
    res.redirect('/');
  }
});

router.post('/register', async function(req, res) {
  var { name, email, username, password, phone, street, city, postalCode, country } = req.body;

  await db.register(name, email, username, password, phone, street, city, postalCode, country);

  req.session.username = username;
  res.redirect('/');
});

function ensureLoggedIn(req, res, next) {
  if (!req.session.username) {
    res.redirect('/login');
  }
  else {
    next();
  }
}

router.use(ensureLoggedIn);

router.get('/', async function(req, res) {
  var { username } = req.session;
  var accountType = await db.getAccountType(username);

  if (accountType === 'Admin') {
    res.redirect('/indexAdmin');
  }
  else if (accountType === 'Manager') {
    res.redirect('/indexManager');
  }
  else if (accountType === 'Guest') {
    res.redirect('/indexGuest');
  }
  else {
    throw new Error('Invalid Account Type');
  }
});

router.get('/indexAdmin', async function(req, res) {
  var { username } = req.session;
  var user = await db.getUser(username);
  var requests = await db.getSystemAccessRequests();

  res.render('indexAdmin', {
    'title': 'Admin Portal',
    'name': user.name,
    'requests': requests,
  });
});

router.post('/indexAdmin', async function(req, res) {
  console.log(req.body);
  if (req.body.grant) {
    await db.grantSystemAccess(req.body.grant);
  }
  else if (req.body.reject) {
    db.rejectSystemAccess(req.body.reject);
  }
  res.redirect('/indexAdmin');
});

router.get('/indexManager', async function(req, res) {
  var { username } = req.session;
  var user = await db.getUser(username);

  res.render('indexManager', {
    title: 'Manager Portal',
    name: user.name,
  });
});

router.get('/indexGuest', async function(req, res) {
  var { username } = req.session;
  var user = await db.getUser(username);

  res.render('indexGuest', {
    title: 'Guest Portal',
    name: user.name,
  });
});

router.post('/indexGuest', async function(req, res) {
  var { username } = req.session;

  if (req.body.accessCode) {
    await db.requestSystemAccess(username, req.body.accessCode);
  }
  res.redirect('/indexGuest');
});

router.post('/', async function(req, res) {
  var { username } = req.session;

  if (req.body.delete) {
    await db.deleteListItems(username, req.body.delete);
  } else {
    await db.addListItem(username, req.body.text);
  }

  res.redirect('/');
});

router.post('/logout', async function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

router.post('/search_page', async function(req, res) {
  res.redirect('/searchRooms');
});

router.get('/searchRooms', async function(req, res) {
  res.render('searchRooms', { title: 'Room Search' } );
});

router.post('/searchRooms', async function(req, res) {
  var { price_min, price_max, start_date, end_date} = req.body;
  //console.log(start_date, end_date, req.session.username);
  //await db.create_reservation(start_date, end_date, req.session);
  req.session.checkin = new Date(start_date);
  req.session.checkout = new Date(end_date);
  //console.log(req.session);
  res.render('searchRooms',{
    rooms: await db.getRoom(price_min, price_max, start_date, end_date),
  });
});

router.post('/bookRoom', async function(req, res) {
  var room_id = (await db.getRoomByID(req.body.room_num))[0]._id;
  req.session.roomID = room_id;
  res.render('payment', { 
    title: 'Book Room',
    room_num: req.body.room_num,
    room: (await db.getRoomByID(req.body.room_num))[0]
  });
});

router.post('/purchase', async function(req, res) {
  var {nameOnCard, ccNumber, ccv} = req.body;
  //console.log(req.body);
  //console.log(nameOnCard, ccNumber, ccv);
  req.session.card_name= nameOnCard;
  req.session.card_number= ccNumber;
  req.session.ccv= ccv;
  var duration = new Date(req.session.end_date) - new Date(req.session.start_date);
  //console.log(ObjectID(req.session.roomID));
  await db.create_reservation(new Date(), duration, req.session.checkin, req.session.checkout, req.session.roomID, req.session.username);

});


module.exports = router;
