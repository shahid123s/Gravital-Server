const mongoose = require('mongoose');

const archiveSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    
},{timestamps: true});


module.exports = mongoose.model('Archive', archiveSchema);