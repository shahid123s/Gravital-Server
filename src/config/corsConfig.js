const cors = require('cors');
const appConfig = require('./appConfig');

const corsConfig = cors({
    origin: appConfig.cors.origin,   // use the env var: ORIGIN_URL
    credentials: true,               // allow cookies & auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});

module.exports = corsConfig;
