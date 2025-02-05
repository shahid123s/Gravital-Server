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
const postRoute = require('./src/modules/post/postRoute');
const saveRoute = require('./src/modules/savedPost/savedPostRoute');
const reportRoute = require('./src/modules/report/reportRoute');
const archiveRoute = require('./src/modules/archive/archiveRoute');
const likeRoute = require('./src/modules/like/likeRoute');
const restrictionRoute = require('./src/modules/restriction/restrictionRoute');
const corsConfig = require('./src/config/corsConfig');
const {port} = require('./src/config/appConfig').app;


const app = express();


app.use(cookieParser());
app.use(express.json());
app.use(corsConfig);

app.use('/api/auth', authRoute )
app.use('/api/user', userRoute)
app.use('/api/follow', followRoute )
app.use('/api/report', reportRoute )
app.use('/api/restriction', restrictionRoute )
app.use('/api/like', likeRoute)
app.use('/api/post',postRoute );
app.use('/api/save',saveRoute );
app.use('/api/archive',archiveRoute );
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