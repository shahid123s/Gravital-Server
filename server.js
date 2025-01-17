const express = require('express')
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();
const {client} = require('./Config/redis')
const connectMongo = require ('./Config/mongo');
const userRoute = require('./Routes/User/userRoutes');
const adminRoute = require('./Routes/Admin/adminRoutes');
const postRoute = require('./Routes/User/postRoutes');

const app = express();

//redis configuration 
client.on('connect', () => {
    console.log('Connected to Redis');
  });
  
client.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

app.use(cookieParser());
app.use(express.json());
app.use(cors({
    origin : 'http://localhost:3000',
    credentials: true,               // Allow credentials (cookies, authorization headers, etc.)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use('/user/api/post',postRoute );
app.use('/user/api', userRoute)
app.use('/admin/api', adminRoute);
const port = process.env.PORT 

client.connect();
app.listen(port, async() => {
    await connectMongo();
    console.log(`server lisitng on ${port}`)
})