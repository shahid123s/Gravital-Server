const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
dotenv.config();

const { client } = require('./src/config/redisConfig');
const connectMongoDB = require('./src/config/dbConfig');
const corsConfig = require('./src/config/corsConfig');
const { authenticateUser } = require('./src/middlewares/userAuthMiddleware');
const errorHandler = require('./src/middlewares/error.middleware');
const { port } = require('./src/config/appConfig').app;

const commentRoute = require('./src/modules/comments/commentRoute');
const userRoute = require('./src/modules/user/userRoutes');
const authRoute = require('./src/modules/auth/authRoute');
const adminRoute = require('./src/modules/admin/adminRoute');
const followRoute = require('./src/modules/follows/followRoute');
const postRoute = require('./src/modules/post/postRoute');
const saveRoute = require('./src/modules/savedPost/savedPostRoute');
const reportRoute = require('./src/modules/report/reportRoute');
const archiveRoute = require('./src/modules/archive/archiveRoute');
const chatRoute = require('./src/modules/chat/chatRoute');
const likeRoute = require('./src/modules/like/likeRoute');
const blockRoute = require('./src/modules/block/blockRoutes');
const restrictionRoute = require('./src/modules/restriction/restrictionRoute');
const { initializeSocket } = require('./src/config/socketConfig');

// mediasoup implementation
// const mediasoupService = require('./src/modules/liveStream/services/streamService');
// const mediasoupSocketHandler = require('./src/modules/liveStream/services/socketIntegrationService');

//DoS Attack prevention

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers,
  message: "Too many requests from this IP, please try again after 15 minutes",
});


const app = express();
const server = http.createServer(app);


app.use(cookieParser());
app.use(express.json());
app.use(corsConfig);
app.use(apiLimiter);


app.use('/api/auth', authRoute);
app.use('/admin/api', adminRoute);

app.use('/api/user', authenticateUser, userRoute);
app.use('/api/follow', authenticateUser, followRoute);
app.use('/api/report', authenticateUser, reportRoute);
app.use('/api/block', authenticateUser, blockRoute);
app.use('/api/restriction', authenticateUser, restrictionRoute);
app.use('/api/like', authenticateUser, likeRoute);
app.use('/api/post', authenticateUser, postRoute);
app.use('/api/save', authenticateUser, saveRoute);
app.use('/api/chat', authenticateUser, chatRoute);
app.use('/api/comment', authenticateUser, commentRoute);
app.use('/api/archive', authenticateUser, archiveRoute);

initializeSocket(server);

// Redis client connects
(async () => {
  try {
    await client.connect();  // Explicitly connect to Redis
    console.log('Connected to Redis successfully');

    // Start the Express server only after Redis is ready
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      connectMongoDB();
    });

    const address = server.address();
    console.log(address.port);

  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);  // Exit process if Redis fails to connect
  }
})();

app.use(errorHandler);