const jwt = require('jsonwebtoken')

const generateAccessToken = async (userId, role) => {
    const accessToken = await jwt.sign(
        { userId, role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_LIFETIME },
    )
    return accessToken;
}


const generateRefreshToken = async (userId, role) => {
    const refreshToken = await jwt.sign(
        { userId, role },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_LIFETIME },
    )

    return refreshToken;
}


const decodeRefreshToken = async (refreshToken) => {
    const decode = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    return {...decode};
}

const decodeAccessToken = async (accessToken) => {
    const decode = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    return decode;
}


module.exports = {
    generateAccessToken,
    generateRefreshToken,
    decodeRefreshToken,
    decodeAccessToken,
}