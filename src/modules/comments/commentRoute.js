const express = require('express');
const router = express.Router();
const { addComment, getComments } = require('./commentController');


router.post('/add-comment', addComment);
router.get('/get-comments', getComments);


module.exports = router;