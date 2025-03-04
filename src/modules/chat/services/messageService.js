const Message = require('../models/messageModel')
const { DATABASE_ERROR } = require('../../../../constants/errorCodes');
const { SERVER_ERROR} = require('../../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../../utils/customError');



/**
 * Fetches messages for a given conversation ID.
 *
 * @async
 * @function fetchMessages
 * @param {string} conversationId - The unique identifier of the conversation.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of message objects.
 * @throws {CustomError} - Throws an error if there is a database issue.
 */
const fetchMessages = async (conversationId) => {
    try {
        return await Message.find({chat: conversationId})
        .sort({updatedAt: -1})
        .lean();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
}

const createMessage = async(message, conversationId, userId) => {

    try {

        const chatMessage = new Message({
            chat: conversationId, 
            content: message,
            sender: userId,
        });

        return await chatMessage.save(); 
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
}

module.exports  = {
    fetchMessages,
    createMessage
}