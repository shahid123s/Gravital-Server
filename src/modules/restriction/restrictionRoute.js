const express = require('express');
const router = express.Router();
const { toggleRestrict } = require('./restrictionController');


router.post('/user',toggleRestrict);
router.post('/post', toggleRestrictPost)

module.exports = router