const { HTTP_STATUS_CODE } = require("../../../../constants/httpStatus");
const { ResponseMessage } = require("../../../../constants/responseMessage");
const { decodeRefreshToken, generateAccessToken } = require("../../../utils/jwtUtils");
const { getRefreshToken } = require("../../../utils/redisUtils");
const { getUserById } = require("../../user/userService");

const refreshAccessToken = async (req, res, next) => {
    const {adminToken} = req.cookies;

    if(!adminToken) {
        return res
        .status(HTTP_STATUS_CODE.FORBIDDEN)
        .json({
            success:false,
            message: ResponseMessage.ERROR.FORBIDDEN,
        })
    }

    try {
        const decode = await decodeRefreshToken(adminToken);
        const admin  = await getUserById(decode._id, true);
        const currentToken = await getRefreshToken(admin.email);

        if(!admin || adminToken !== currentToken ){
            return res
            .status(HTTP_STATUS_CODE.FORBIDDEN)
            .json({
                success:false,
                message: ResponseMessage.ERROR.FORBIDDEN,
            })
        }

        const accessToken = await generateAccessToken(admin._id, 'admin');
        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
        .json({
            accessToken, 
            massage: ResponseMessage.SUCCESS.OK
        });

    } catch (error) {
        next()
    }
    
}