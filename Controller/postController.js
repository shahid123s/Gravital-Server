const Post = require('../Model/postModel');
const User = require('../Model/userModel');
const Like = require('../Model/postLikeModel');
const SavedPost = require('../Model/savedPostModel')
const { STATUS_CODE } = require('../Config/enum');
const { POST_BUCKET_NAME, s3, PutObjectCommand } = require('../Config/s3');
const { generatePreSignedUrlForProfileImageS3 } = require('../Config/getProfileImageUrl');
const { getCachedProfileImageUrl, getCachedPostUrl } = require('../Config/redis');
const { ResponseMessage } = require('../Constants/messageConstants');
const { postActionButton } = require('../library/filteration');



const addPost = async (req, res) => {
    const userId = req.user.userId;
    const caption = req.body.caption;
    const file = req.file;
    console.log(file);

    try {

        if (file) {
            const filetype = req.file.mimetype.startsWith('video') ? 'videos' : 'images';
            const fileKey = `${filetype}/${Date.now()}_${userId}_${file.originalname}`;

            const params = {
                Bucket: POST_BUCKET_NAME,
                Key: fileKey,
                Body: file.buffer,
                ContentType: file.mimetype,
            }

            const command = new PutObjectCommand(params);
            await s3.send(command)

            const post = new Post({
                userID: userId,
                fileName: fileKey,
                caption,
            });

            const newPost = await post.save();
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $push: { post: newPost._id } },
                { new: true },
            )
            res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.UPDATED })
        }
    } catch (error) {
        console.log(error);
        res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })
    }

}

const getAllPost = async (req, res) => {
    const limit = 3;
    const { userId } = req.user;
    const { page } = req.query;
    try {
        const posts = await Post.find().
            populate({
                path: 'userID',
                select: 'username fullName profileImage'
            })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();


        for (const post of posts) {
            post.postUrl = await generatePreSignedUrlForProfileImageS3(post.fileName, true);
            [post.likedByUser, post.likedCount, post.isSavedByUser] = await Promise.all([
                Like.exists({ postId: post._id, userId }),
                Like.find({ postId: post._id }).countDocuments(),
                SavedPost.exists({ postId: post._id, userId })
            ])



            if (post.userID.profileImage) {
                post.userID.profileImage = await getCachedProfileImageUrl(
                    post.userID._id,
                    post.userID.profileImage
                );
            }
        }

        // console.log(posts)

        res.status(STATUS_CODE.SUCCESS_OK).json({ posts, hasMore: posts.length === limit, message: ResponseMessage.SUCCESS.OK })


    } catch (error) {
        console.log(error)
        res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })
    }
}


const toggleLike = async (req, res) => {
    const { postId } = req.body;
    const { userId } = req.user;

    console.log(postId, userId)

    try {
        const [post, user] = await Promise.all([
            Post.findById(postId),
            User.findById(userId)
        ])
        if (!post || !user) {
            return res.status(STATUS_CODE.NOT_FOUND).json({ message: ResponseMessage.ERROR.NOT_FOUND });
        }
        let like = await Like.exists({ userId, postId });

        if (like) {
            await Like.deleteOne({ userId, postId });
            return res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.UPDATED });
        }

        await Like.create({ postId, userId });
        res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.UPDATED });

    } catch (error) {
        console.log(error);
        res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })
    }
}

const toggleSave = async (req, res) => {
    const { userId } = req.user;
    const { postId } = req.body;

    try {
        const [post, user] = await Promise.all([
            Post.findById(postId),
            User.findById(userId)
        ])

        if (!post || !user) {
            return res.status(STATUS_CODE.NOT_FOUND).json({ message: ResponseMessage.ERROR.NOT_FOUND });
        }

        const isExists = await SavedPost.exists({ postId, userId });
        if (isExists) {
            await SavedPost.deleteOne({ postId, userId });
            return res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.UPDATED });

        }

        await SavedPost.create({ postId, userId })
        res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.UPDATED });

    } catch (error) {
        res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })
    }

}

const getUsersPost = async (req, res) => {
    const { userId } = req.user;
    const { username } = req.query;
    console.log(req.query,  userId, 'pari')

    try {
        let posts;
        if (!username) {
            posts = await Post.find({ userID: userId }).lean();
            for (const post of posts) {
                post.postUrl = await getCachedPostUrl(post._id, post.fileName);
            }
            return res.status(STATUS_CODE.SUCCESS_OK).json({ posts, message: ResponseMessage.SUCCESS.OK })
        }
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(STATUS_CODE.NOT_FOUND).json({ message: ResponseMessage.ERROR.NOT_FOUND });
        }
        console.log(user._id)

        posts = await Post.find({ userID: user._id }).lean();

        for (const post of posts) {
            post.postUrl = await getCachedPostUrl(post._id, post.fileName);
        }

        res.status(STATUS_CODE.SUCCESS_OK).json({ posts, message: ResponseMessage.SUCCESS.OK })

    } catch (error) {
        console.log(error)
        res.status(STATUS_CODE.SERVER_ERROR).json({
            message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR,
        })
    }
}

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
}

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
}