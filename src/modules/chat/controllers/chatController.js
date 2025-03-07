const { fetchFollowingList } = require("../../follows/followServices");
const { ResponseMessage } = require("../../../../constants/responseMessage");
const { fetchChatList, createConversation, existsConversation } = require("../services/chatService");
const { getCachedProfileImageUrl } = require("../../../utils/redisUtils");
const { HTTP_STATUS_CODE } = require("../../../../constants/httpStatus");

const getChatList = async (req, res, next) => {
    try {
        const {userId} = req.user;
        let chatList;
        chatList = await fetchChatList(userId);

        chatList = await Promise.all(chatList.map(async (chat) => {
            
            let profileImage ;
            let chatName
            if(chat.type === 'personal') {
                const otherParticipants = chat.participants.find(p => p._id.toString() !== userId);

                profileImage = otherParticipants.profileImage;
                profileImage = await getCachedProfileImageUrl(otherParticipants._id, otherParticipants.profileImage);
                chatName = otherParticipants.fullName
            }

            return {
                ...chat,
                profileImage,
                chatName,
            }
        }))

        // console.log(chatList)

        res.status(HTTP_STATUS_CODE.SUCCESS_OK).json({
            success: true,
            message: ResponseMessage.SUCCESS.OK,
            chatList,
        })
    } catch (error) {
        next(error)
    }

}

const createChat = async (req, res, next) => {
  try {
    const {userId: targetUserId} = req.body;
    const {userId} = req.user;

    let conversation = await existsConversation('personal', [userId, targetUserId]);

    if(conversation) {
        return res.status(HTTP_STATUS_CODE.SUCCESS_OK)
        .json({success: true, message: ResponseMessage.SUCCESS.OK, conversation,})
    }
    conversation = await createConversation(userId, [targetUserId],'personal');
    res.status(HTTP_STATUS_CODE.SUCCESS_OK).json({
        success: true,
        message: ResponseMessage.SUCCESS.OK,
        conversation,
    })
    
  } catch (error) {
    next(error)
  }



}


module.exports = {
    getChatList,
    createChat,
}