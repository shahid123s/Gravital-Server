const cors = require('cors');
const appConfig = require('./appConfig');


//configure the cors 

const corsConfig = cors({
    origin : ["https://gravital.shahidnoushad.com"],
    credentials: true,               // Allow credentials (cookies, authorization headers, etc.)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'],
})

module.exports = corsConfig;