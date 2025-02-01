const dotenv = require('dotenv')
dotenv.config();

// appConfiguration from .env 

const appConfig = {
    app: {
        port: process.env.PORT || 8000,
        environment: process.env.NODE_ENV || 'development', 
    },
    cors: {
        origin: process.env.ORIGIN_URL || 'http://localhost:3000',
    },
    db: {
        uri: process.env.MONGO_URI,
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
    },
    jwt: {
        accessSecret: process.env.ACCESS_TOKEN_SECRET, 
        accessExpiry: process.env.ACCESS_TOKEN_LIFETIME, 
        refreshSecret: process.env.REFRESH_TOKEN_SECRET,
        refreshExpiry: process.env.REFRESH_TOKEN_LIFETIME,
    },
    email: {
        email: process.env.NODEMAILER_EMAIL,
        password: process.env.NODEMAILER_PASSWORD
    },
    awsS3: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
        profileBucket: process.env.AWS_S3_BUCKET_NAME,
        postBucket: process.env.AWS_S3_POST_BUCKET_NAME,
        region: process.env.AWS_S3_BUCKET_REGION,
    },
}

module.exports  = appConfig;