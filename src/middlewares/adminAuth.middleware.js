const { HTTP_STATUS_CODE } = require('../../constants/httpStatus');
const { decodeAccessToken } = require('../utils/jwtUtils');
const { ResponseMessage } = require('../../constants/responseMessage');
const CustomError = require('../utils/customError');
const ERROR_CODES = require('../../constants/errorCodes');
const {ADMIN} = require('../../constants/roles');


const authenticateAdmin = async (req, res, next) => {
    const authHead = req.headers['authorization'];
    if (!authHead || !authHead.startsWith('Bearer ')) {
        throw new CustomError(
            ResponseMessage.ERROR.AUTHORIZATION.INVALID_ACCESS_TOKEN,
            HTTP_STATUS_CODE.UNAUTHORIZED,
            ERROR_CODES.INVALID_TOKEN
        );
    }
    const token = authHead && authHead.split(' ')[1];

    if (!token) {
        throw new CustomError(
            ResponseMessage.ERROR.AUTHORIZATION.INVALID_TOKEN,
            HTTP_STATUS_CODE.UNAUTHORIZED,
            ERROR_CODES.INVALID_TOKEN
        );
    }
    try {
        const decode = await decodeAccessToken(token);
        if (decode.role != ADMIN) {
            throw new CustomError(
                ResponseMessage.ERROR.AUTHORIZATION.INVALID_TOKEN,
                HTTP_STATUS_CODE.UNAUTHORIZED,
                ERROR_CODES.INVALID_TOKEN,
            );
        }
        req.user = decode;
        next();
    } catch (error) {
        console.log(error.message);
        throw new CustomError(
            ResponseMessage.ERROR.AUTHORIZATION.INVALID_TOKEN,
            HTTP_STATUS_CODE.UNAUTHORIZED,
            ERROR_CODES.INVALID_TOKEN
        );
    }
}

module.exports = authenticateAdmin