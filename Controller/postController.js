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
        // Fetch archived posts, users who blocked the current user, and users the current user blocked
        const [archivedPost, blockedByUsers, blockedUsers] = await Promise.all([
            Archive.find().select('postId').lean(),
            Block.find({ blockedId: userId }).select('blockerId').lean(),
            Block.find({ blockerId: userId }).select('blockedId').lean()
        ]);

        // Extract IDs from objects
        const archivedPostIds = archivedPost.map(post => post.postId);
        const blockedByUserIds = blockedByUsers.map(block => block.blockerId);
        const blockedUserIds = blockedUsers.map(block => block.blockedId);

        // Merge both blocking arrays to exclude them from posts
        const blockedIds = [...blockedByUserIds, ...blockedUserIds];

        console.log(archivedPostIds, blockedIds, 'Filtered post IDs');

        // Fetch posts with proper filtering
        const posts = await Post.find({
            isRestricted: false,
            _id: { $nin: archivedPostIds }, // Exclude archived posts
            userID: { $nin: blockedIds } // Exclude posts from blocked users
        })
        .populate({
            path: 'userID',
            select: 'username fullName profileImage'
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

        // Process each post
        for (const post of posts) {
            post.postUrl = await generatePreSignedUrlForProfileImageS3(post.fileName, true);
            [post.likedByUser, post.likedCount, post.isSavedByUser] = await Promise.all([
                Like.exists({ postId: post._id, userId }),
                Like.countDocuments({ postId: post._id }),
                SavedPost.exists({ postId: post._id, userId })
            ]);

            if (post.userID.profileImage) {
                post.userID.profileImage = await getCachedProfileImageUrl(
                    post.userID._id,
                    post.userID.profileImage
                );
            }
        }

        res.status(STATUS_CODE.SUCCESS_OK).json({
            posts,
            hasMore: posts.length === limit,
            message: ResponseMessage.SUCCESS.OK
        });

    } catch (error) {
        console.log(error);
        res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR });
    }
};


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
    console.log(req.query, userId, 'pari')

    try {
        let posts;

        
        
        if (!username) {
            const archivedPost  = await Archive.find({userId}).select('postId').lean();
            const archivedPostIds = archivedPost.map(post => post.postId);
            
            posts = await Post.find({ userID: userId , _id: {$nin: archivedPostIds}})
            .populate({
                path: 'userID',
                select: 'username fullName profileImage'
            })
            .lean();

            posts = await Promise.all(
                posts.map(async (post) => {
                    const postUrl = await getCachedPostUrl(post._id, post.fileName);
                    post.userID.profileImage = await getCachedProfileImageUrl(post.userID._id , post.userID.profileImage)
                    const [likedByUser, likedCount, isSavedByUser] = await Promise.all([
                        Like.exists({ postId: post._id, userId }) || false,
                        Like.countDocuments({ postId: post._id }) || 0,
                        SavedPost.exists({ postId: post._id, userId }) || false,
                    ]);
                    return {
                        ...post,
                        postUrl,
                        likedByUser,
                        likedCount,
                        isSavedByUser,
                    };
                })
            );

            console.log(posts, 'profile le post')
            // posts = posts.filter((post) => post._id != )
            return res.status(STATUS_CODE.SUCCESS_OK).json({ posts, message: ResponseMessage.SUCCESS.OK })
        }
        
        
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(STATUS_CODE.NOT_FOUND).json({ message: ResponseMessage.ERROR.NOT_FOUND });
        }
        const archivedPost  = await Archive.find({userId: user._id}).select('postId').lean();
        const archivedPostIds = archivedPost.map(post => post.postId);
        
        const isBlocked = await Block.exists({
            blockerId: user._id,
            blockedId: userId,
        })

        console.log(isBlocked, 'isBlocked')

        if (isBlocked) {
            return res
                .status(200)
                .json({ message: ResponseMessage.SUCCESS.OK, posts: [] })
        }


        posts = await Post.find({ userID: user._id , _id: {$nin: archivedPostIds}})
        .populate({
            path: 'userID',
            select: 'username fullName profileImage'
        })
        .lean();

        posts = await Promise.all(
            posts.map(async (post) => {
                const postUrl = await getCachedPostUrl(post._id, post.fileName);
                post.userID.profileImage = await getCachedProfileImageUrl(post.userID._id , post.userID.profileImage)
                
                const [likedByUser, likedCount, isSavedByUser] = await Promise.all([
                    Like.exists({ postId: post._id, userId }) || false,
                    Like.countDocuments({ postId: post._id }) || 0,
                    SavedPost.exists({ postId: post._id, userId }) || false,
                ]);
                return {
                    ...post,
                    postUrl,
                    likedByUser,
                    likedCount,
                    isSavedByUser,
                };
            })
        );
        
        

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
};


const archivePost = async (req, res) => {
   const {postId} = req.body;
   const {userId} = req.user


   const archive = {
       userId,
       postId,
   }
   const isExists = await Archive.exists(archive);
   console.log(isExists, 'exista ana')
   if(isExists){
       await Archive.deleteOne(archive);
       return res.status(STATUS_CODE.SUCCESS_OK).json({message:ResponseMessage.SUCCESS.UPDATED})
   }

   await Archive.create(archive)

   res.status(STATUS_CODE.SUCCESS_OK).json({message: ResponseMessage.SUCCESS.UPDATED})
   
}

 const getArchivePost = async (req, res) => {
    const {userId} = req.user; 
    // console.log(userId)
    try {

            const response = await Archive.find({userId}).populate({
                path: 'postId',
                populate: {
                    path: 'userID',
                    select: 'username fullName profileImage'
                }
            })
        


            const postDetials = await Promise.all(
                response.map(async (post) => {
                    post.postId.fileName = await getCachedPostUrl(post.postId._id, post.postId.fileName);
                    post.postId.userID.profileImage = await getCachedProfileImageUrl(post.postId.userID._id, post.postId.userID.profileImage)
                    return post;
                })
            )

            console.log(postDetials);

            res.status(STATUS_CODE.SUCCESS_OK).json({message: ResponseMessage.SUCCESS.OK, posts: postDetials})

    } catch (error) {
        
    }
 }

 const publishPost = async (req, res) => {
    const {postId} = req.body;

    try {
        
        const response  = await Archive.findOneAndDelete({postId});
        res.status(STATUS_CODE.SUCCESS_OK).json({message: ResponseMessage.SUCCESS.UPDATED})
    } catch (error) {
        console.log(error)
        res.status(STATUS_CODE.SUCCESS_OK).json({message: ResponseMessage.SUCCESS.OK, posts: postDetials})
    }
 }

 const deletPost = async (req, res) => {
    const {postId} = req.body;

    try {
    const response = await Promise.all([
        Post.findByIdAndDelete(postId) ,
        Archive.findOneAndDelete({postId}),
        SavedPost.deleteMany({postId}),
        Like.deleteMany({postId}),
        Report.deleteMany({postId})

    ])

    res.status(STATUS_CODE.SUCCESS_OK).json({message: ResponseMessage.SUCCESS.UPDATED})
    } catch (error) {
        res.status(STATUS_CODE.SUCCESS_OK).json({message: ResponseMessage.SUCCESS.OK, posts: postDetials})

    }
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
    getArchivePost,
    archivePost,
    publishPost,
    deletPost,
}

