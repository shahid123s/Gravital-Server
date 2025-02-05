const express = require('express');
const { getArchivePostCount } = require('./archiveServices');
const { getArchivedPosts, archivePost } = require('./archiveController');
const router = express.Router();

router.route('/')
.get(getArchivedPosts)
.post(archivePost);

router.post('/publish', )
