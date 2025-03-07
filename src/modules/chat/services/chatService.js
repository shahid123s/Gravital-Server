const Chat =  require("../models/chatModel");
const { DATABASE_ERROR } = require('../../../../constants/errorCodes');
const { SERVER_ERROR} = require('../../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../../utils/customError');


/**
 * Fetches the latest 13 chat conversations for a given user.
 *
 * @async
 * @function fetchChatList
 * @param {string} userId - The ID of the user whose chat list needs to be fetched.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of chat objects.
 * 
 * @throws {CustomError} Throws a CustomError if there is a database error.
 * 
 * @example
 * try {
 *     const chats = await fetchChatList("65c1234abcd5678efg910");
 *     console.log(chats);
 * } catch (error) {
 *     console.error(error.message);
 * }
 */
const fetchChatList = async (userId) => {
    try {
        return await Chat.find({participants: userId })
        .populate({
            path: 'participants',
            select: 'fullName profileImage',
        })
        .sort({updatedAt: -1})
        .limit(13)
        .lean();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
}
/**
 * Checks if a conversation exists with the given participants.
 * 
 * @param {string} type - The type of chat ('personal' or 'group').
 * @param {Array<string>} userIds - The list of user IDs to check for an existing conversation.
 * @returns {Promise<boolean>} - Returns `true` if a conversation exists, otherwise `false`.
 * @throws {CustomError} - Throws an error if there is a database issue.
 */
const existsConversation = async (type, userIds) => {
    try {
            return await Chat.findOne({participants: { $all : userIds}});
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
}

/**
 * Creates a new conversation (personal or group).
 *
 * @async
 * @function createConversation
 * @param {string} userId - The ID of the user creating the chat.
 * @param {string[]} targetUserIds - An array of user IDs to add to the chat.
 * @param {'personal' | 'group'} [type='personal'] - The type of chat, either 'personal' or 'group'.
 * @param {string} [chatName=''] - The name of the chat (only applicable for group chats).
 * @param {string|null} [groupAdmin=null] - The ID of the group admin (only applicable for group chats).
 * @returns {Promise<Object>} The created chat document.
 * @throws {CustomError} If an error occurs while creating the conversation.
 */
const createConversation = async (userId, targetUserIds, type = 'personal', chatName = '', groupAdmin = null, ) => {
    try {
        const chat = new Chat({
            chatName, 
            groupAdmin,
            participants: [userId, ...targetUserIds],
            type,
        })
        
        return await chat.save()
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
}



module.exports = {
    fetchChatList,
    createConversation,
    existsConversation,
}