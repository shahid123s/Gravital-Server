const Post = require('../Model/postModel');
const User = require('../Model/userModel');
const Like = require('../Model/postLikeModel');
const SavedPost = require('../Model/savedPostModel');
const Comment = require('../Model/commentModel')
const { STATUS_CODE } = require('../Config/enum');
const { POST_BUCKET_NAME, s3, PutObjectCommand } = require('../Config/s3');
const { generatePreSignedUrlForProfileImageS3 } = require('../Config/getProfileImageUrl');
const { getCachedProfileImageUrl, getCachedPostUrl } = require('../Config/redis');
const { ResponseMessage } = require('../constants/messageConstants');
const { postActionButton } = require('../DeletingFolder/library/filteration');
const Block = require('../Model/blockModel');
const Report = require('../Model/reportModel');
const Archive = require('../Model/archveModel');




const restrictPost = async (req, res) => {
    const { postId } = req.body;
    const response = await Post.findByIdAndUpdate(postId, { $set: { isRestricted: true } })
    console.log(response)
    res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.UPDATED })

}
const unRestrictPost = async (req, res) => {
    const { postId } = req.body;
    const response = await Post.findByIdAndUpdate(postId, { $set: { isRestricted: false } })
    console.log(response)
    res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.UPDATED })
}

const boostPost = async (req, res) => {
    const { postId } = req.body;
    const response = await Post.findByIdAndUpdate(postId, { $set: { isPostBoost: true } });
    res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.UPDATED })

}
// const checkStatus = async (req, res) => {
//     const {postId} = req.body;
//     const response = await Post.findByIdAndUpdate(postId, {$set: {isPostBoost: true}});
//     res.status(STATUS_CODE.SUCCESS_OK).json({message  : ResponseMessage.SUCCESS.UPDATED})

// }

const getPostData = async (req, res) => {
    const { postId } = req.query;

    const postData = await Post.findById(postId)
        .populate({
            path: 'userID',
            select: 'username fullName'
        })
        .lean()

    postData.fileName = await getCachedPostUrl(postData._id, postData.fileName)
    postData.actions = await postActionButton(postData)


    console.log(postData);

    res.status(STATUS_CODE.SUCCESS_OK).json({ postData, message: ResponseMessage.SUCCESS.OK })
};




module.exports = {
    addPost,
    getAllPost,
    toggleLike,
    getUsersPost,
    toggleSave,
    restrictPost,
    unRestrictPost,
    boostPost,
    getPostData,
    getArchivePost,
    archivePost,
    publishPost,
    deletPost,
}

