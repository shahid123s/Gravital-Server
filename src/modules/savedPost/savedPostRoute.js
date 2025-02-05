const express = require('express');
const { toggleSave } = require('./savedController');
const router = express.Router();


router.patch('/post', toggleSave);


module.exports = router