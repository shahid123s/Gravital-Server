const mongoose = require('mongoose');


const restrictedSchema = new mongoose.Schema({
    restrictedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

    restrictedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

}, { timestamps: true })

module.exports = mongoose.model('Restrict', restrictedSchema);