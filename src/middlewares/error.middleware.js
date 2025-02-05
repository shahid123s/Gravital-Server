const ERROR_CODES = require("../../constants/errorCodes");
const { HTTP_STATUS_CODE } = require("../../constants/httpStatus");


const errorHandler = (err, req, res, next) => {
    // if (res.headersSent) {
    //     return next(err); // Prevents Express from sending duplicate responses
    // }
    // console.error('Error:', err.message); // Log the error for debugging
    // Set default status code and error message
    console.log(err , 'eee poottila')
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Send the error response
    res.status(statusCode).json({
        success: false,
        message: message,
        errorCode: err.errorCode || 'UNKNOWN_ERROR',
    });
};

module.exports = errorHandler;