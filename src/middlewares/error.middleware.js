const ERROR_CODES = require("../../constants/errorCodes");
const { HTTP_STATUS_CODE } = require("../../constants/httpStatus");

const errorHandler = (err, req, res, next) => {
    console.log(err.stack);

    res
    .status(HTTP_STATUS_CODE.SERVER_ERROR || 500 )
    .json({
        errorCode: err.code || 'UNKNOWN_ERROR',
        message: err.message || 'Internal Server Error',
    });

}