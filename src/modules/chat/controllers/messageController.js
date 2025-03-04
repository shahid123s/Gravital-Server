const { HTTP_STATUS_CODE } = require("../../../../constants/httpStatus");
const { ResponseMessage } = require("../../../../constants/responseMessage");
const { fetchMessages, createMessage } = require("../services/messageService");

const getMessage = async (req, res, next) => {
try {
    const {userId} = req.user;
    const {conversationId} = req.query;

    const response = await fetchMessages(conversationId);
    const messages = await Promise.all(response.map((message) => {
        const isCurrentUser = message.sender.toString() === userId? true: false;
        return {
            ...message,
            isCurrentUser,
        }
    }))

    res.status(HTTP_STATUS_CODE.SUCCESS_OK)
    .json({
        success: true,
        message: ResponseMessage.SUCCESS.OK,
        messages,
    })

} catch (error) {
    next(error)
}
}


const sentMessage = async (req, res, next) => {
    const {message, conversationId} = req.body;
    const {userId} = req.user;

    await createMessage(message, conversationId, userId);

    res.status(HTTP_STATUS_CODE.SUCCESS_OK)
    .json({
        success: true, 
        message:ResponseMessage.SUCCESS.OK,

    })
}

module.exports = {
    getMessage,
    sentMessage
}