const express = require('express')
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();
const {client} = require('./src/config/redisConfig')
const connectMongoDB = require('./src/config/dbConfig')
const userRoute = require('./src/modules/user/userRoutes');
const authRoute = require('./src/modules/auth/authRoute')
const adminRoute = require('./Routes/Admin/adminRoutes');
const followRoute = require('./src/modules/follows/followRoute')
const postRoute = require('./Routes/User/postRoutes');
const corsConfig = require('./src/config/corsConfig');
const {port} = require('./src/config/appConfig').app;


const app = express();


app.use(cookieParser());
app.use(express.json());
app.use(corsConfig);

app.use('/api/auth', authRoute )
app.use('/user/api/post',postRoute );
app.use('/api/user', userRoute)
app.use('/api/follow', followRoute )
app.use('/admin/api', adminRoute);


//redis client connects 
(async () => {
    try {
        await client.connect();  // Explicitly connect to Redis
        console.log('Connected to Redis successfully');

        // Start the Express server only after Redis is ready
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            connectMongoDB()
        });

    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        process.exit(1);  // Exit process if Redis fails to connect
    }
})();