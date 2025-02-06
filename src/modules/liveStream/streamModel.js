const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema({
    title: {
         type: String, 
         required: true 
        },
    description: {
         type: String 
        },
    streamerId: {
         type: mongoose.Schema.Types.ObjectId, 
         ref: 'User', 
         required: true 
        },
    startTime: { 
        type: Date, 
        default: Date.now
    },
    endTime: {
         type: Date
         },
    isLive: { 
        type: Boolean, 
        default: false
     },
    viewers: [{ 
        type: mongoose.Schema.Types.ObjectId, ref: 'User' 
    }], // Track viewers
    comments: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
    }],
});

module.exports = mongoose.model('Stream', streamSchema);