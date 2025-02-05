const express = require('express')
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();
const { client } = require('./src/config/redisConfig')
const connectMongoDB = require('./src/config/dbConfig')
const userRoute = require('./src/modules/user/userRoutes');
const authRoute = require('./src/modules/auth/authRoute')
const adminRoute = require('./src/modules/admin/adminRoute');
const followRoute = require('./src/modules/follows/followRoute')
const postRoute = require('./src/modules/post/postRoute');
const saveRoute = require('./src/modules/savedPost/savedPostRoute');
const reportRoute = require('./src/modules/report/reportRoute');
const archiveRoute = require('./src/modules/archive/archiveRoute');
const likeRoute = require('./src/modules/like/likeRoute');
const restrictionRoute = require('./src/modules/restriction/restrictionRoute');
const corsConfig = require('./src/config/corsConfig');
const {authenticateUser} = require('./src/middlewares/userAuthMiddleware');
const errorHandler = require('./src/middlewares/error.middleware');
const { port } = require('./src/config/appConfig').app;


const app = express();


app.use(cookieParser());
app.use(express.json());
app.use(corsConfig);


app.use('/api/auth', authRoute)
app.use('/admin/api', adminRoute);

app.use('/api/user',authenticateUser ,userRoute)
app.use('/api/follow',authenticateUser, followRoute)
app.use('/api/report',authenticateUser, reportRoute)
app.use('/api/restriction',authenticateUser, restrictionRoute)
app.use('/api/like',authenticateUser, likeRoute)
app.use('/api/post',authenticateUser, postRoute);
app.use('/api/save',authenticateUser, saveRoute);
app.use('/api/archive',authenticateUser, archiveRoute);


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

app.use(errorHandler)