const {comparePassword} = require('../Config/bcrypt');
const User = require('../Model/userModel');
const {generateAccessToken, generateRefreshToken, decodeRefreshToken} = require('../Config/jwt');
const { generatePreSignedUrlForProfileImageS3 } = require('../Config/getProfileImageUrl');
const Post = require('../Model/postModal');
const { STATUS_CODE } = require('../Config/enum');
const { ResponseMessage } = require('../Constants/messageConstants');
const { getCachedProfileImageUrl } = require('../Config/redis');
const { postActionButton } = require('../library/filteration');

const adminLogin = async (req, res) => {
    const {email, password} = req.body;

    try {
        const user = await User.findOne({email});
    if(!user){
        return res.status(STATUS_CODE.UNAUTHORIZED).json({message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS});
    }
    if(user.role !== 'admin'){
        return res.status(STATUS_CODE.NOT_ACCEPTED).json({message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS});
    }
    const isMatch = await comparePassword(password, user.password);
    
    if(!isMatch){
        return res.status(STATUS_CODE.NOT_FOUND).json({message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS})
    };

    const accessToken = await generateAccessToken(user._id, user.role);
    const refreshToken = await generateRefreshToken(user._id, user.role);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('adminToken', refreshToken, {
        httpOnly: true,
        secure: false,  
        sameSite: 'Lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(STATUS_CODE.SUCCESS_OK)
    .json({message : ResponseMessage.SUCCESS.AUTHENTICATION.LOGIN, accessToken});
    } catch (error) {
        console.log(error);
        res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })
    }


}

const usersList = async(req, res) => {
    try {
 
     const {search, page, limit} = req.query;
     const skip = (page - 1) * limit;
     const searchData = search.trim().replace(/[^a-zA-Z\s]/g, "");
 
     const [userList,countList] = await Promise.all([
         User.find({
             $and: [
                 { fullName: { $regex: new RegExp(`^${searchData}`, "i") } },
                 { role: 'user' }
             ]
         } ,'username email fullName phoneNumber isBan isBlock profileImage isVerified' ).skip(skip).limit(limit).lean(),
         User.find({
             $and: [
                 { fullName: { $regex: new RegExp(`^${searchData}`, "i") } },
                 { role: 'user' }
             ]
         }  ).countDocuments(),
     ]);
 
     const totalPage = Math.ceil(countList / limit) ;
     console.log(countList, totalPage)
 
     console.log(userList) 
     if(userList.some(user => user.profileImage)){
         for (const user of userList ){
             const profileImage = await generatePreSignedUrlForProfileImageS3(user.profileImage);
             const actions = userActionButton(user);
             user.profileImage = profileImage
             user.actions = actions
         }
 
         console.log(userList)
         return res.status(STATUS_CODE.SUCCESS_OK).json({userList, totalPage, currentPage : page, message:ResponseMessage.SUCCESS.OK})
     }
     
     res.status(STATUS_CODE.SUCCESS_OK).json({userList, totalPage, currentPage : page, message: ResponseMessage.SUCCESS.OK})
    } catch (error) {
     console.log(error);
     return res
     .status(STATUS_CODE.GATEWAY_TIMEOUT)
     .json({message : ResponseMessage.ERROR.INTERNET_SERVER_ERROR})
    }
 }
 


const banUser = async (req, res) => {
    const {userId} = req.body;

    const response = await User.findByIdAndUpdate(userId, {$set:{isBan : true}})
    console.log(response)
    console.log(userId);
    res.status(STATUS_CODE.SUCCESS_OK).json({message  : ResponseMessage.SUCCESS.UPDATED})
}


const unBanUser = async (req, res) => {
    const { userId} = req.body;
    await User.findByIdAndUpdate( userId, {$set : {isBan: false}});
    res.status(STATUS_CODE.SUCCESS_OK).json({message: ResponseMessage.SUCCESS.UPDATED})
}


const userData = async(req, res) => { 
    const { userId } = req.query;
    try {
        const user = await User.findById(userId).select('-password -refreshToken').lean();
        if(user.profileImage){
            user.profileImage = await getCachedProfileImageUrl(user._id, user.profileImage);
        }
        res.status(STATUS_CODE.SUCCESS_OK).json({user, message: ResponseMessage.SUCCESS.OK})
    } catch (error) {
        res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })

    }
}

const blockUser = async (req, res) => {
    const {userId} = req.body;
   try {
    console.log(userId, req.body)
    await User.findByIdAndUpdate(userId, {$set: {isBlock: true ,refreshToken : null}});
    res.status(STATUS_CODE.SUCCESS_OK).json({message: ResponseMessage.SUCCESS.UPDATED});
   } catch (error) {
    res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })

   }
}

const unBlockUser = async (req, res) => {
    const {userId} = req.body;
   try {
    await User.findByIdAndUpdate(userId, {$set: {isBlock: false}});
    res.status(STATUS_CODE.SUCCESS_OK).json({message: ResponseMessage.SUCCESS.UPDATED});
   } catch (error) {
    res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })
   }


}

const refreshAccessToken = async (req, res) => {
    const {adminToken} = req.cookies;

    if(!adminToken) {
        return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({message: ResponseMessage.ERROR.FORBIDDEN});
    }
    
    try {
        const decode = await decodeRefreshToken(adminToken);
        const user = await User.findById(decode.userId);
    
        if(!user || user.refreshToken != adminToken) {
             return res.status(STATUS_CODE.FORBIDDEN).json({message: ResponseMessage.ERROR.FORBIDDEN});
        }
        const accessToken =  await generateAccessToken(user._id, user.role);
        res.status(STATUS_CODE.SUCCESS_OK).json({accessToken, message: ResponseMessage.SUCCESS.OK})
        
    } catch (error) {       
        res.status(STATUS_CODE.FORBIDDEN).json({message: ResponseMessage.ERROR.FORBIDDEN});
    }

}


const adminLogout = async (req, res) => {
    res.clearCookie('adminToken');
    res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.AUTHENTICATION.LOGOUT })
}



const postsList = async (req, res) => {
    try {
        
        const {search, page, limit} = req.query;
        const skip = (page - 1) * limit;
        const searchData  = search.trim().replace(/[^a-zA-Z}\s]/g, "");

        const [postList, countList] = await Promise.all([
            Post.find({}, 'caption fileName uploadDate like').populate({
                path: 'userID',
                select: 'username fullName profileImage'
            })
            .skip(skip)
            .limit(limit)
            .lean(),
            Post.find({}).countDocuments()
        ])

        const totalPages = Math.ceil(countList/ limit);

        if(postList.some(post => post.fileName)){
                for(const post of postList){
                    post.fileName  = await generatePreSignedUrlForProfileImageS3(post.fileName, true);
                    post.actions = postActionButton(post)
                }

            return res.status(STATUS_CODE.SUCCESS_OK).json({postList, totalPages, currentPage: page, message: ResponseMessage.SUCCESS.OK});
        }
        
        

    } catch (error) {
        res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })

    }
}


module.exports = {
    adminLogin,
    usersList,
    banUser,
    unBanUser,
    userData,
    blockUser,
    unBlockUser,
    refreshAccessToken,
    adminLogout,
    postsList,
}