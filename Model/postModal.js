const mongoose = require('mongoose');


const postSchema =  new mongoose.Schema({
    userID : {
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
    like : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Like'
    }],
    comment : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
    }],
    postSaved: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    views: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],

    isRestricted: {
        type: Boolean,
        default: false,
    },

    isPostBoost: {
        type: Boolean,
        default:  false,
    }
    
});


module.exports = mongoose.model('Post', postSchema);