const mongoose = require('mongoose');


const postSchema =  new mongoose.Schema({
    userId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    fileName: {
        type: String,
        default: '',
    },
    caption: {
        type: String,
        default: '',
    },
    uploadDate: {
        type: Date,
        default: Date.now(),
    },
    isRestricted: {
        type: Boolean,
        default: false,
    },

    isPostBoost: {
        type: Boolean,
        default:  false,
    },
    shareCount: {
        type: Number,
        default: 0,
    }
    
});


module.exports = mongoose.model('Post', postSchema);