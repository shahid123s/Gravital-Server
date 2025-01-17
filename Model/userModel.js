const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userID: {
        type: String,
        unique: true,
        required: true,
    },
    username: {
        type: String,
        unique: true,
        trim: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },

    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    profileImage: {
        type: String,
        default: '',
    },
    fullName: {
        type: String,
        required: true,
    },
    bio: {
        type: String,
        default: '',
    },
    isBan : {
        type : Boolean,
        default :false
    },
    
    refreshToken : {
        type: String,
    },  

    dob: {
        type: Date,
        required: true,
    },

    gender: {
        type:String,
        enum: ['Male', 'Female', 'None'],
        default: 'None',
    },


    isBlock : {
        type : Boolean,
        default :false
    },

    post: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    }],
    likePost: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    }],
    savedPost: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    }],

    isPrivate: {
        type: Boolean,
        default: false,
    },
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    isVerified: {
        type: Boolean,
        default: false,
    },
    verficationToken: {
        type: String,
    },
    verficationTokenExpire: {
        type: Date,
    },

    lastLogin: {
        type: Date,
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date,
    },

    notification: {
        type : [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Notification'
        }]
    },
    unreadedNotificationCount: {
        type: Number,
        default : 0
    },

    paymentHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    }],

}, {timestamps : true});


module.exports = mongoose.model('User', userSchema);
