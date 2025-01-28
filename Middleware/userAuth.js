const { STATUS_CODE } = require('../Config/enum');
const {decodeAccessToken} = require('../Config/jwt');
const { ResponseMessage } = require('../Constants/messageConstants');
const User = require('../Model/userModel')

const authenticateUser = async (req, res, next) => {
    const authHead = req.headers['authorization'];
    if (!authHead || !authHead.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'AccessToken Required' });
    }

    const token = authHead && authHead.split(' ')[1];

    if(!token){
        return res.status(401)
        .json({message: 'AccessToken Required'});
    }
    try {
        const decode = await decodeAccessToken(token);
        if(decode.role != 'user') {
            return res
            .status(STATUS_CODE.UNAUTHORIZED)
            .json({message: ResponseMessage.ERROR.AUTHORIZATION.INVALID_TOKEN})
        }
        req.user = decode;
        next();
    } catch (error) {
        console.log(error.message)
        return res.status(401).json( {message: 'Invalid or Expired Token'} )
    }
}

const verifyUserStatus = async (req, res, next) => {
    const user = await User.findById(req.user.userId);
    if(!user || user.isBlock){
        return res.status(401).json( {message: 'User Blocked'} )
    }
    next();
}

module.exports= {
    authenticateUser,
    verifyUserStatus
}