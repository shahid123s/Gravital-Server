const mongoose = require('mongoose');

const savedPostSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    },
    userId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
})
module.exports = mongoose.model('SavedPost', savedPostSchema); 
