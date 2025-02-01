
const { createClient } = require('redis');
const appConfig = require('./appConfig');

// Create Redis client with environment variables
const client = createClient({
    password: appConfig.redis.password,
    socket: {
        host: appConfig.redis.host,
        port: appConfig.redis.port,
    }
});

// Redis connection events
client.on('connect', () => {
    console.log('Redis client connected');
});

client.on('error', (err) => {
    console.error('Redis error:', err);
});

// Export the client for use in other parts of the application
module.exports = { client };