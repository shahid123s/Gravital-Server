const { HTTP_STATUS_CODE } = require("../../../constants/httpStatus");
const { ResponseMessage } = require("../../../constants/responseMessage");
const { createComment, fetchCommentsByPostId } = require("./commentServices");
const { enrichComment } = require("./utils/commnetUtils");


const  addComment = async (req, res, next) => {
    const  {postId,comment} = req.body;
    const {userId} = req.user;
    try {
        await createComment({postId,userId,comment});
        return res.status(HTTP_STATUS_CODE.SUCCESS_OK).json({
            success: true,
            message: ResponseMessage.SUCCESS.OK,

        });
    } catch (error) {
        return next(error);
    }
}


const getComments = async (req, res, next) => {
    const {postId, skip, limit} = req.query;

    try {
        const comments = await fetchCommentsByPostId( postId, skip, limit );
        const data = await Promise.all(comments.map(async (comment) => {
           return await enrichComment(comment);
        }))

        return res.status(HTTP_STATUS_CODE.SUCCESS_OK).json({
            success: true,
            message: ResponseMessage.SUCCESS.OK,
            data,
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    addComment,
    getComments,
}