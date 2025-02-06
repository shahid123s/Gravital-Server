const express = require('express');
const router = express.Router();
const {toggleBlock} = require('./blockController')
router.post('/toggle-block', toggleBlock )

module.exports = router;