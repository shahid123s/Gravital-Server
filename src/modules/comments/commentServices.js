const Comment = require('./commentModel');
const { DATABASE_ERROR } = require('../../../constants/errorCodes');
const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../utils/customError');

const createComment = async (commentDetails = {}) => {
    try {
        const comment = new Comment(commentDetails);
        return await comment.save();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
}

const fetchCommentsByPostId = async (postId, skip = 0, limit= 3) => {
    try {
        return await Comment
            .find({ postId })
            .populate('userId', 'username profileImage')
            .sort({ createdAt: -1 })
            .skip(skip)
            // .limit(limit)
            .lean();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
}


const getCommentCount = async (postId) => {
    try {
        return await Comment.countDocuments({ postId });
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }   
}


module.exports = {
    createComment,
    fetchCommentsByPostId,
    getCommentCount,
}