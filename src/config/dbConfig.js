const mongoose = require('mongoose');
const appConfig = require('./appConfig');

const connectMongoDb = async () => {
    try {
        await mongoose.connect(appConfig.db.uri);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.log(`${error.message} happens in connecting the Mongodb`);
    }
}

module.exports = connectMongoDb;