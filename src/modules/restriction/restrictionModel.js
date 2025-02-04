const mongoose = require('mongoose');


const restrictionSchema = new mongoose.Schema({
    restrictedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

    restrictedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

}, { timestamps: true })

module.exports = mongoose.model('Restriction', restrictionSchema);