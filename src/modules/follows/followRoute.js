const express = require('express');
const { toggleFollow } = require('./followController');
const router = express.Router();


router.post('/toggle-follow', toggleFollow);

module.exports = router