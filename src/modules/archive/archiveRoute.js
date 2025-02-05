const express = require('express');
const { getArchivedPosts, archivePost, publishPost } = require('./archiveController');
const router = express.Router();

router.route('/')
.get(getArchivedPosts)
.post(archivePost);

router.post('/publish', publishPost );
