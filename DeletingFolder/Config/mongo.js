const mongoose = require('mongoose');

const connectMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
       console.log('Conneted to MongoDB ');
    } catch (error) {
        console.log(`${error.message} happens in connecting the mongodb`)    
    }
}


module.exports = connectMongoDB;