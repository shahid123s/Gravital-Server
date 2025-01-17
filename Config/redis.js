const { createClient } = require('redis');
const { generatePreSignedUrlForProfileImageS3 } = require('./getProfileImageUrl');

const client = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

const storeData = async (key, value, expiration) => {
    try {
        await client.setEx(key, expiration, JSON.stringify(value));
        console.log("Data stored Successfully")
        return "Data stored Successfully"

    } catch (error) {
        console.log(error)
        return error
    }
}

const storeOtp = async (email, otp) => {
    try {
        await client.setEx(`otp:${email}`, 300, otp);
        console.log('OTP Stored Successfully')
        return "OTP Stored Successfully";
    } catch (error) {
        console.log(error , 'haha');
        return error
    }
}

const getData = async (key) => {
    try {
        const data = await client.get(key);
        if(data){
            return JSON.parse(data)
        }
    } catch (error) {
        console.log(error);
        return error
    }
}

const getOtp = async (email) => {
    try {
        const data = await client.get(`otp:${email}`);
        if(data){
            return JSON.parse(data)
        }
        return null
    } catch (error) {
        console.log(error);
        return error
    }
}

const getCachedProfileImageUrl = async (userId, profileImageKey) => {
    const redisKey = `profileImage${userId}`;
    let profileImageUrl = await client.get(redisKey);

    if(!profileImageUrl){
        profileImageUrl = await generatePreSignedUrlForProfileImageS3(profileImageKey);
        await client.setEx(redisKey, 3600, profileImageUrl)
    }
    return profileImageUrl;
}

module.exports = {
    client,
    storeData,
    storeOtp,
    getData,
    getOtp,
    getCachedProfileImageUrl
}