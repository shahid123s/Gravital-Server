const express = require('express');
const router = express.Router();
const { toggleRestrict } = require('./restrictionController');


router.post('/user',toggleRestrict);
router.post

module.exports = router