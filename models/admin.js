const express = require ("express");
const mongoose = require('mongoose');

// Define the Admin schema
const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role:{

  }
});

// Create the Admin model
const Admin = mongoose.model('Admin', AdminSchema);

// Export the Admin model
module.exports = Admin;
