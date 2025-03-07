const { client } = require('../config/redisConfig');
const { generatePreSignedUrl } = require('./aswS3Utils');

// Store any data with expiration in Redis
/**
 * 
 * @param {stirng} email - User email  
 * @param {object} value - Data to store in redis
 * @param {number} expiration - Expiration time  
 * @returns {Promise<string>} - Message or a Promise
 */
const storeData = async (email, value, expiration = 1000) => {
    try {
        await client.setEx(email, expiration, JSON.stringify(value));
        console.log("Data stored Successfully");
        return "Data stored Successfully";
    } catch (error) {
        console.log(error);
        return error;
    }
}

// Store OTP with expiration in Redis
const storeOtp = async (email, otp) => {
    try {
        await client.setEx(`otp:${email}`, 300, otp); // Expiry set to 5 minutes
        console.log('OTP Stored Successfully');
        return "OTP Stored Successfully";
    } catch (error) {
        console.log(error, 'haha');
        return error;
    }
}

// Store refreshToken in Redis
const storeRefreshToken = async (email, token) => {
    try {
        client.setEx(`token${email}`, 604800, token );
        console.log('Token stored in redis' ,email);
        return 'Token stored Successfully'
    } catch (error) {
        console.log(error, 'redis')
        return error;
    }
}

// Get refreshToken from Redis
const getRefreshToken = async (email) => {
    try {
        return await client.get(`token${email}`);
    } catch (error) {
        console.log(error);
        return error;
    }
}
// Remove token from Redis
const deleteToken = async (email) => {
    try {
        await client.del(email);
        return 'Deleted Successfully'
    } catch (error) {
        console.log(error)
        return error;
    }
}

// Get data by key from Redis
const getData = async (email) => {
    try {
        const data = await client.get(email);
        if (data) {
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.log(error);
        return error;
    }
}

// Get OTP for an email from Redis
const getOtp = async (email) => {
    try {
        const data = await client.get(`otp:${email}`);
        if (data) {
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.log(error);
        return error;
    }
}

// Get cached profile image URL from Redis or generate a new one if not found
const getCachedProfileImageUrl = async (userId, profileImageKey) => {
    const redisKey = `profileImage${userId}`;
    let profileImageUrl = await client.get(redisKey);

    if (!profileImageUrl) {
        profileImageUrl = await generatePreSignedUrl(profileImageKey, false);
        await client.setEx(redisKey, 3400, profileImageUrl); // Cache for 1 hour
    }
    return profileImageUrl;
}

// Get cached post URL from Redis or generate a new one if not found
const getCachedPostUrl = async (postId, fileName) => {
    const redisKey = `post${postId}`;
    let fileUrl = await client.get(redisKey);

    if (!fileUrl) {
        fileUrl = await generatePreSignedUrl(fileName, true);
        await client.setEx(redisKey, 3500, fileUrl); // Cache for 1 hour
    }
    return fileUrl;
}

// Export the utility functions to use in other parts of the application
module.exports = {
    storeData,
    storeOtp,
    storeRefreshToken,
    getData,
    getOtp,
    getRefreshToken,
    getCachedProfileImageUrl,
    getCachedPostUrl,
    deleteToken,
    
}