const Post = require('../Model/postModal')
const User = require('../Model/userModel')
const {STATUS_CODE} = require('../Config/enum');
const { POST_BUCKET_NAME, s3, PutObjectCommand } = require('../Config/s3');
const { generatePreSignedUrlForProfileImageS3 } = require('../Config/getProfileImageUrl');
const { getCachedProfileImageUrl } = require('../Config/redis');
const { ResponseMessage } = require('../Constants/messageConstants');



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

const getPost = async (req, res) => {
    const limit = 3;
    const { userId } = req.user;
    const { page } = req.query;
    console.log(page)
    try {
        const posts = await Post.find().
            populate({
                path: 'userID',
                select: 'username fullName profileImage'
            })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        // console.log(posts);
        // console.log(posts)
        for (const post of posts) {
            post.postUrl = await generatePreSignedUrlForProfileImageS3(post.fileName, true);
            post.likedByUser = post.like.some((id) => id.toString() ===  userId )
            post.isSavedByUser = post.postSaved.some(id => id.toString() === userId);
            const likedCount = post.like.length;
            post.likedCount = likedCount;


            if (post.userID?.profileImage) {
                post.userID.profileImage = await getCachedProfileImageUrl(
                    post.userID._id,
                    post.userID.profileImage
                );
            }
        }

        // console.log(posts)

        res.status(STATUS_CODE.SUCCESS_OK).json({ posts, hasMore: posts.length === limit , message: ResponseMessage.SUCCESS.OK})


    } catch (error) {
        console.log(error)
        res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })
    }
}


const toggleLike = async (req, res) => {
    const { postId } = req.body;
    const { userId } = req.user;
    
    // console.log(postId, userId)

    try {
        const [post, user] = await Promise.all([
            Post.findById(postId),
            User.findById(userId)
        ])
        if (!post) {
            return res.status(STATUS_CODE.NOT_FOUND).json({ message: ResponseMessage.ERROR.NOT_FOUND });
        }

        const likeIndex = post.like.findIndex(
            (like) => like.toString() === userId
        );

        const postIndex = user.likePost.findIndex(
            (id) => id.toString() === postId
        )

        if (likeIndex === -1  && postIndex === -1) {
            post.like.push(userId);
            user.likePost.push(userId)
            await Promise.all([
                post.save(),
                user.save()
               ])
        }

        else {
            post.like.splice(likeIndex, 1);
            user.likePost.splice(postIndex, 1)
            await Promise.all([
            post.save(),
            user.save()
           ])
        }

        console.log(post, user)

        res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.UPDATED });

    } catch (error) {
        console.log(error);
        res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })
    }
}

const toggleSave = async (req, res) => {
    const {userId} = req.user;
    const {postId} = req.body;

    try {
        const [post, user] = await Promise.all([
            Post.findById(postId),
            User.findById(userId)
        ])

        if(!post){
            return res.status(STATUS_CODE.NOT_FOUND).json({message: ResponseMessage.ERROR.NOT_FOUND});
        }

        const savedIndex = post.postSaved.findIndex(
            (save) => save.toString() === userId
        );

        const postIndex = user.savedPost.findIndex(
            (Id) => Id.toString() === postId
        )
        
        if(savedIndex === -1  && postIndex === -1 ){
            post.postSaved.push(userId);
            user.savedPost.push(postId);
            await Promise.all([
                post.save(),
                user.save()
               ])
        }
        else {
            post.postSaved.splice(savedIndex, 1);
            user.savedPost.splice(postIndex, 1)
            await Promise.all([
                post.save(),
                user.save()
               ])
        }

        res.status(STATUS_CODE.SUCCESS_OK).json({message: ResponseMessage.SUCCESS.UPDATED}); 

    } catch (error) {
        res.status(STATUS_CODE.SERVER_ERROR).json({message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR})
    }

}

const getUsersPost = async (req, res) => {
    const { userId } = req.user;
    const {username} = req.query;
    console.log(req.query, 'pari')
    console.log('vanna')
    try {
        let usersPost
        if(!username){
        usersPost = await User.findById(userId).
        populate({
            path: 'post',
            options: { lean: true },
        })

       }
       else {
        usersPost = await User.findOne({username}).
        populate({
            path: 'post',
            options: {lean: true}
        })
       }
        const posts = usersPost.post;
            console.log(posts.length)
        for (const post of posts) {
            post.postUrl = await generatePreSignedUrlForProfileImageS3(post.fileName, true);
            const likedCount = post.like.length;
            post.likedCount = likedCount;
        }

        // console.log(usersPost, 'ith aaan')
        res.status(STATUS_CODE.SUCCESS_OK).json({posts, message: ResponseMessage.SUCCESS.OK})
    } catch (error) {
        console.log(error)
        res.status(STATUS_CODE.SERVER_ERROR).json({
            message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR,
        })
    }
}

const restrictPost = async (req, res) => {
    const {postId} = req.body;
    const response = await Post.findByIdAndUpdate(postId, {$set: {isRestricted: true}})
    console.log(response)
    res.status(STATUS_CODE.SUCCESS_OK).json({message  : ResponseMessage.SUCCESS.UPDATED})

}
const unRestrictPost = async (req, res) => {
    const {postId} = req.body;
    const response = await Post.findByIdAndUpdate(postId, {$set: {isRestricted: false}})
    console.log(response)
    res.status(STATUS_CODE.SUCCESS_OK).json({message  : ResponseMessage.SUCCESS.UPDATED})
}

const boostPost = async (req, res) => {
    const {postId} = req.body;
    const response = await Post.findByIdAndUpdate(postId, {$set: {isPostBoost: true}});
    res.status(STATUS_CODE.SUCCESS_OK).json({message  : ResponseMessage.SUCCESS.UPDATED})

}
// const checkStatus = async (req, res) => {
//     const {postId} = req.body;
//     const response = await Post.findByIdAndUpdate(postId, {$set: {isPostBoost: true}});
//     res.status(STATUS_CODE.SUCCESS_OK).json({message  : ResponseMessage.SUCCESS.UPDATED})

// }

module.exports = {
    addPost,
    getPost,
    toggleLike,
    getUsersPost,
    toggleSave,
    restrictPost,
    unRestrictPost,
    boostPost
}