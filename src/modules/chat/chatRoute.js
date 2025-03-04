const express = require('express');
const { getChatList, createChat } = require('./controllers/chatController');
const { getMessage, sentMessage } = require('./controllers/messageController');
const router = express.Router();

router
.route('/')
.get(getChatList)
.post(createChat);
router.route('/message')
.get( getMessage)
.post(sentMessage)



module.exports = router;   