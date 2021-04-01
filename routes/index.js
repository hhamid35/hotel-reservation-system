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
    console.log(req.session.username);
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
    console.log('Redirecting to Admin Portal');
    res.redirect('/indexAdmin');
  }
  else if (accountType === 'Manager') {
    console.log('Redirecting to Manager Portal');
    res.redirect('/indexManager');
  }
  else if (accountType === 'Guest') {
    console.log('Redirecting to Guest Portal');
    res.redirect('/indexGuest');
  }
  else {
    throw new Error('Invalid Account Type');
  }
});

router.get('/indexAdmin', async function(req, res) {
  var { username } = req.session;
  console.log(username);
  var user = await db.getUser(username);

  res.render('indexAdmin', {
    title: 'Admin Portal',
    name: user.name,
  });
});

router.get('/indexManager', async function(req, res) {
  var { username } = req.session;
  console.log(username);
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

router.post('/', async function(req, res) {
  var { username } = req.session;

  if (req.body.delete) {
    await db.deleteListItems(username, req.body.delete);
  } else {
    await db.addListItem(username, req.body.text);
  }

  res.redirect('/');
});

router.post('/logout', async function(res, req) {
  req.session.username = '';
  res.redirect('/');
});

module.exports = router;
