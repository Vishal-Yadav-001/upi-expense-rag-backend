require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing connection to:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, { family: 4 })
  .then(() => {
    console.log('Connected!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
