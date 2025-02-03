const { HTTP_STATUS_CODE } = require("../../../constants/httpStatus");
const { ResponseMessage } = require("../../../constants/responseMessage");
const {
    removeFollow,
    getFollowDocumentId,
    createFollowRelationship,
} = require('./followServices')

const toggleFollow = async (req, res, next) => {
    const {userId} = req.user;
    const targetUserId = req.body.userId;

    try {
        if(!targetUserId) {
            return res
            .status(HTTP_STATUS_CODE.BAD_REQUEST)
            .json({
                success: false,
                message: ResponseMessage.ERROR.BAD_REQUEST,
            });
        }

        const isExists = await getFollowDocumentId(userId, targetUserId);
        console.log(isExists) // ivda check cheyyanam
        if(isExists){
            await removeFollow(isExists._id);
            return res 
            .status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED,
            })
        }
        
        await createFollowRelationship()

    } catch (error) {
        next(error)
    }
}


module.exports = {
    toggleFollow,
}