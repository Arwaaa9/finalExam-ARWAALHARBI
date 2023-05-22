const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const Product = require('./models/Product');
const User = require('./models/Product');


require("dotenv").config();

// crybto
const bcrypt = require("bcrypt");
const saltRounds = 10;

mongoose
  .connect(process.env.DB_URL)
  .then(() => {
    console.log("connected!!!");
  })
  .catch((err) => {
    console.log(err);
  });
const app = express();

app.get("/", (req, res) => {
  res.send("hiii");
});

///////////////////////////

// Set up session and cookie parser middleware
app.use(cookieParser());
app.use(session({
  secret: 'mysecretkey',
  resave: true,
  saveUninitialized: true
}));

// Set up body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Set up EJS as the view engine
app.set('view engine', 'ejs');

// Set up initial admin user
app.get('/createInitialAdmin', (req, res) => {
  const username = 'admin';
  const password = 'secret';

  // Hash the password
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else {
      // Store the admin user in the database
      const admin = {
        username: username,
        password: hash
      };
      req.session.admin = admin;
      res.sendStatus(200);
    }
  });
});

// Middleware to check if the user is logged in
const requireLogin = (req, res, next) => {
  if (req.session.admin) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Login route
app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  // Check if the username and password are correct
  if (username === 'admin' && password === 'secret') {
    // Store the admin user in the session
    const admin = {
      username: username,
      password: password
    };
    req.session.admin = admin;
    res.redirect('/dashboard');
  } else {
    res.send('Invalid username or password');
  }
});

// Dashboard page
app.get('/dashboard', requireLogin, (req, res) => {
  res.render('dashboard', { username: req.session.admin.username });
});

// Products page
app.get('/products', requireLogin, (req, res) => {
  const products = [
    { name: 'Product 1', description: 'Description 1', price: 10 },
    { name: 'Product 2', description: 'Description 2', price: 20 },
    { name: 'Product 3', description: 'Description 3', price: 30 }
  ];
  res.render('products', { products: products });
});

// Remove product route
app.post('/removeProduct', requireLogin, (req, res) => {
  const productName = req.body.productName;

  // Remove the product from the database
  console.log('Product removed:', productName);
  res.send('Product removed successfully');
});

// Add product route
app.post('/addProduct', requireLogin, (req, res) => {
  const name = req.body.name;
  const description = req.body.description;
  const price = req.body.price;

  // Validate the product data
  if (!name) {
    res.send('Name is required');
  } else if (price < 1 || price > 9999) {
    res.send('Price must be between 1 and 9999');
  } else {
    // Store the product in the database
    const product = {
      name: name,
      description: description,
      price: price
    };
    console.log('New product:', product);
    res.send('Product added successfully');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Middleware to redirect to login page if not logged in
app.use((req, res, next) => {
  if (req.session.admin || req.path === '/login' || req.path === '/createInitialAdmin') {
    next();
  } else {
    res.redirect('/login');
  }
});


// for API side 

// Set up body parser middleware
app.use(bodyParser.json());

// Set up database
const users = [];
const products = [
  { id: 1, name: 'Product 1', description: 'Description 1', price: 10 },
  { id: 2, name: 'Product 2', description: 'Description 2', price: 20 },
  { id: 3, name: 'Product 3', description: 'Description 3', price: 30 }
];
const userProducts = {};

// Register route
app.post('/api/register', (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  // Check if the username or email is already taken
  if (users.find(user => user.username === username)) {
    res.status(400).send('Username already taken');
  } else if (users.find(user => user.email === email)) {
    res.status(400).send('Email already taken');
  } else {
    // Hash the password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error(err);
        res.sendStatus(500);
      } else {
        // Store the user in the database
        const user = {
          id: users.length + 1,
          username: username,
          email: email,
          password: hash
        };
        users.push(user);
        res.sendStatus(200);
      }
    });
  }
});

// Login route
app.post('/api/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  // Find the user with the given username
  const user = users.find(user => user.username === username);

  if (!user) {
    res.status(401).send('Invalid username or password');
  } else {
    // Check if the password is correct
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        console.error(err);
        res.sendStatus(500);
      } else if (!result) {
        res.status(401).send('Invalid username or password');
      } else {
        // Generate a JWT token and send it to the client
        const token = jwt.sign({ id: user.id }, 'mysecretkey');
        res.json({ token: token });
      }
    });
  }
});


// Middleware to check if the user is logged in
const requireLogin1 = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    res.status(401).send('Unauthorized');
  } else {
    jwt.verify(token, 'mysecretkey', (err, decoded) => {
      if (err) {
        console.error(err);
        res.status(401).send('Unauthorized');
      } else {
        req.userId = decoded.id;
        next();
      }
    });
  }
};

// Buy product route
app.post('/api/buyProduct/:productId', requireLogin, (req, res) => {
  const productId = parseInt(req.params.productId);

  // Find the product with the given ID
  const product = products.find(product => product.id === productId);

  if (!product) {
    res.status(404).send('Product not found');
  } else {
    // Attach the product to the user
    if (!userProducts[req.userId]) {
      userProducts[req.userId] = [];
    }
    userProducts[req.userId].push(product);

    res.sendStatus(200);
  }
});

// My products route
app.get('/api/myProducts', requireLogin, (req, res) => {
  const myProducts = userProducts[req.userId] || [];
  res.json(myProducts);
});



app.listen(8888, () => {
  console.log("listening!!!!!!!");
});
