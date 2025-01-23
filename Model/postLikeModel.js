const mongoose = require('mongoose');

const postLikeSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    },
    userId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

}, {timestamps: true})

module.exports = mongoose.model('Likes', postLikeSchema); 