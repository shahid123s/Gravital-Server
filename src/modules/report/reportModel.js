const mongoose = require('mongoose');

const reportModal = new mongoose.Schema({
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    reportMessage: {
        type: String,
        required : true,
        default: '',
    },
    reportedId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'reportType', 
      },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    },
    reportType: {
        type: String,
        enum: ['user', 'post'],
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved'],
        default: 'pending',
    },

},{ timestamps: true})

module.exports = mongoose.model('Report', reportModal);