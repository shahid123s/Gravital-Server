const User = require('../Model/userModel');
const Post = require('../Model/postModel')
const { hashPassword, comparePassword } = require('../Config/bcrypt');
const { getData, storeData, storeOtp, getOtp, getCachedProfileImageUrl } = require('../Config/redis')
const genrateOtp = require('../Config/generateOtp')
const sendOtpToEmail = require('../Config/sendOTPEmail')
const { v4: uuidv4 } = require('uuid');
const { generateAccessToken, generateRefreshToken, decodeRefreshToken } = require('../Config/jwt');
const { BUCKET_NAME, PutObjectCommand, s3 } = require('../Config/s3')
const { generatePreSignedUrlForProfileImageS3 } = require('../Config/getProfileImageUrl');
const validateInput = require('../Config/validate');
const { default: mongoose } = require('mongoose');
const Follow = require('../Model/followModel');
const { STATUS_CODE } = require('../Config/enum');
const { ResponseMessage } = require('../Constants/messageConstants');
const { convertDateToMonthAndYear } = require('../Config/dateConvertion');
const Block = require('../Model/blockModel');
const Archive = require('../Model/archveModel');
const PreDefinedUserDetails = require('../Constants/predefinedUserDetails');


const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    return res
      .status(STATUS_CODE.FORBIDDEN)
      .json({ message: ResponseMessage.ERROR.AUTHORIZATION.INVALID_TOKEN });
  }
  try {
    const decode = await decodeRefreshToken(refreshToken);
    const user = await User.findById(decode.userId);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: ResponseMessage.ERROR.AUTHORIZATION.INVALID_TOKEN });
    }

    //
    const accessToken = await generateAccessToken(user._id, user.role);

    res.status(STATUS_CODE.SUCCESS_OK).json({ accessToken, message: ResponseMessage.SUCCESS.OK });

  } catch (error) {
    res.status(STATUS_CODE.FORBIDDEN).json({ message: ResponseMessage.ERROR.AUTHORIZATION.INVALID_TOKEN });
  }
}

const suggesstingUser = async (req, res) => {
  try {
    const { userId } = req.user; // Get current user ID from req.user
    const userIDObject = new mongoose.Types.ObjectId(userId);

    const response = await User.aggregate([
      // Lookup to check if the user is followed by the current user
      {
        $lookup: {
          from: "follows",
          localField: "_id",
          foreignField: "following",
          as: "isFollowed",
        },
      },
      {
        $addFields: {
          isFollowedByUser: {
            $in: [userIDObject, "$isFollowed.follower"],
          },
        },
      },

      // Lookup to check if the user is blocked (both ways)
      {
        $lookup: {
          from: "blocks",
          let: { suggestedUserId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $and: [{ $eq: ["$blockerId", userIDObject] }, { $eq: ["$blockedId", "$$suggestedUserId"] }] }, // Current user blocked the suggested user
                    { $and: [{ $eq: ["$blockerId", "$$suggestedUserId"] }, { $eq: ["$blockedId", userIDObject] }] } // Suggested user blocked current user
                  ],
                },
              },
            },
          ],
          as: "blockStatus",
        },
      },
      {
        $addFields: {
          isBlocked: { $gt: [{ $size: "$blockStatus" }, 0] }, // If entries exist, user is blocked
        },
      },

      // Lookup to get the count of posts for the user
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "userID",
          as: "userPosts",
        },
      },
      {
        $addFields: {
          postCount: { $size: "$userPosts" },
        },
      },

      // Filter out users who are already followed, blocked, or the current user
      {
        $match: {
          isFollowedByUser: false,
          isBlocked: false, // Exclude blocked users
          role: { $ne: "admin" },
          _id: { $ne: userIDObject },
        },
      },

      // Project required fields
      {
        $project: {
          _id: 1,
          username: 1,
          fullName: 1,
          profileImage: 1,
          postCount: 1,
        },
      },

      // Sort by post count
      {
        $sort: {
          postCount: -1,
        },
      },

      // Limit to 4 suggestions
      {
        $limit: 4,
      },
    ]);


    // Handle profile image transformation (e.g., caching)
    let usersList = await Promise.all(
      response.map(async (user) => {
        user.profileImage = await getCachedProfileImageUrl(
          user._id,
          user.profileImage
        );
        return user;
      })
    );

    // Send the response
    res
      .status(200)
      .json({ usersList, message: "Suggested users fetched successfully." });
  } catch (error) {
    console.error("Error suggesting users:", error);
    res.status(500).json({ message: "Failed to fetch suggested users." });
  }
};

const userDetails = async (req, res) => {
  const { userId } = req.user;
  const { username } = req.query;


  let user;
  let followersCount = 0;
  let followingsCount = 0;
  let isFollowed = false;
  let postCount = 0;
  let archivePostCount = 0;
  try {
    if (!username) {
      [user, followersCount, followingsCount, postCount, archivePostCount] = await Promise.all([
        User.findById(userId, 'username fullName profileImage bio gender post  '),
        Follow.countDocuments({ following: userId }),
        Follow.countDocuments({ follower: userId }),
        Post.find({userID: userId}).countDocuments(),
        Archive.find({userId}).countDocuments(),
      ])
    }
    else {

      user = await User.findOne({ username }, 'username fullName profileImage bio gender  ');

      
      if (!user) {
        return res.status(STATUS_CODE.NOT_FOUND).json({ message: ResponseMessage.ERROR.NOT_FOUND })

      };

      const isBlocked = await Block.exists({
        blockerId: user._id,
        blockedId : userId,
      })
      
      if(isBlocked){
         return res.status(STATUS_CODE.SUCCESS_OK)
        .json({message: ResponseMessage.SUCCESS.OK,  user: PreDefinedUserDetails })
      }

      [followersCount, followingsCount, isFollowed, postCount, archivePostCount] = await Promise.all([
        Follow.countDocuments({ following: user._id }),
        Follow.countDocuments({ follower: user._id }),
        Follow.exists({ follower: userId, following: user._id }),
        Post.find({userID: user._id}).countDocuments(),
        Archive.find({userId: user._id}).countDocuments(),
      ])

    }


    if (!user) {
      return res.status(STATUS_CODE.NOT_FOUND).json({ message: ResponseMessage.ERROR.NOT_FOUND})
    }

    
    console.log(archivePostCount, 'nokk')

    if (user && user.profileImage) {
      const profileImage = await generatePreSignedUrlForProfileImageS3(user.profileImage);
      return res.status(STATUS_CODE.SUCCESS_OK).json({
        user: {
          ...user.toObject(),
          profileImage,
          postCount: postCount - archivePostCount,
          followersCount,
          followingsCount,
          isFollowed: isFollowed ? true : false
        },
        message: ResponseMessage.SUCCESS.OK,
      })
    }
    res.status(STATUS_CODE.SUCCESS_OK).json({ user, message: ResponseMessage.SUCCESS.OK, })
  } catch (error) {
    console.log(error);
    res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR });
  }


}

const updateProfile = async (req, res) => {
  const { userId } = req.user;
  const { bio, gender } = req.body
  const file = req.file;


  console.log(bio, gender);
  try {
    if (file) {
      const filetype = req.file.mimetype.startsWith('video') ? 'videos' : 'images';
      const fileKey = `${filetype}/${userId}_${file.originalname}`;

      const params = {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }

      const command = new PutObjectCommand(params);
      await s3.send(command);
      console.log(fileKey,);

      const user = await User.findByIdAndUpdate(userId, {
        profileImage: fileKey,
        bio,
        gender,
      }, { new: true })

      await user.save();
    }
    else {
      const user = await User.findByIdAndUpdate(userId, {
        bio,
        gender,
      }, { new: true });

      await user.save();
    }


    res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.OK })

  } catch (error) {
    console.log(error);
    res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })
  }
}

const toggleFollow = async (req, res) => {
  const { userId } = req.user;
  const targetUserId = req.body.userId;
  console.log(userId, targetUserId)
  try {
    if(!targetUserId) {
      return res
      .status(STATUS_CODE.BAD_REQUEST)
      .json({message: ResponseMessage.ERROR.BAD_REQUEST});
    }
    const existingFollow = await Follow.findOne({ follower: userId, following: targetUserId });
    console.log(existingFollow)
    if (existingFollow) {
      await Follow.findByIdAndDelete(existingFollow._id)
      return res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.UPDATED });
    }
    const follow = new Follow({
      follower: userId,
      following: targetUserId,
    })

    await follow.save();

    res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.UPDATED })

  } catch (error) {
    res.status(STATUS_CODE.SERVER_ERROR).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR })
  }

}

const aboutProfile = async (req, res) => {
  const { username } = req.query;

  try {
    const user = await User.findOne({
      username,
    }, 'username createdAt profileImage ').lean();

    user.createdAt = convertDateToMonthAndYear(user.createdAt);
    console.log(user.createdAt)
    user.profileImage = await getCachedProfileImageUrl(user._id, user.profileImage);

    console.log(user)
    res.status(STATUS_CODE.SUCCESS_OK).json({ user, message: ResponseMessage.SUCCESS.OK })
  } catch (error) {

  }
}

module.exports = {
  refreshAccessToken,
  suggesstingUser,
  userDetails,
  updateProfile,
  toggleFollow,
  aboutProfile,
}