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
const PreDefinedUserDetails = require('../Constants/predefinedUserDetails');

const sendotp = async (req, res) => {
  const { username, email, password, } = req.body;

  const validationErrors = validateInput({ username, email, password });
  if (Object.keys(validationErrors).length) {
    return res.status(400).json({ errors: validationErrors, message: ResponseMessage.ERROR.BAD_REQUEST });
  }
  try {

    if (username && email && password) {
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(STATUS_CODE.CONFLICT)
          .json({ message: ResponseMessage.ERROR.AUTHENTICATION.EXISTS_EMAIL });
      };

      user = await User.findOne({ username });

      if (user) {
        return res
          .status(STATUS_CODE.CONFLICT)
          .json({ message: ResponseMessage.ERROR.AUTHENTICATION.EXISTS_USERNAME })
      }

      const hasedPassword = await hashPassword(password);

      user = {
        userID: uuidv4(),
        username,
        email,
        password: hasedPassword,
      }
      storeData(email, user, 1000);
    }
    const otp = genrateOtp(7);
    storeOtp(email, JSON.stringify(otp));
    sendOtpToEmail(email, otp);

    res
      .status(STATUS_CODE.SUCCESS_OK)
      .json({ message: ResponseMessage.SUCCESS.AUTHENTICATION.OTP_SEND });



  } catch (error) {
    if (error.code === 11000) {
      console.error(error.message);
      return res.status(STATUS_CODE.CONFLICT).json({ message: ResponseMessage.ERROR.AUTHENTICATION.EXISTS_USERNAME })
    }
    console.error(`${error.message} happens in register the user`);
    res
      .status(STATUS_CODE.SERVER_ERROR)
      .json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR });
  }
}


const otpVerification = async (req, res) => {
  const { otp, email } = req.body;
  if (!otp || !email) {
    return res.status(400).json({ message: ResponseMessage.ERROR.AUTHENTICATION.INSUFFICENT_CREDENTIALS });
  }
  try {

    const currentOtp = await getOtp(email)
    if (!currentOtp) {
      return res.status(STATUS_CODE.NOT_FOUND).json({ message: ResponseMessage.ERROR.AUTHENTICATION.OTP_EXPIRED })
    }
    if (+otp === Number(currentOtp)) {
      return res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.AUTHENTICATION.OTP_VERIFIED })
    }
    else {
      return res.status(STATUS_CODE.NOT_FOUND).json({ message: ResponseMessage.ERROR.AUTHENTICATION.OTP_MISMATCH })
    }


  } catch (error) {
    console.log(error)
    res.status(STATUS_CODE.GATEWAY_TIMEOUT).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR });
  }
}


const register = async (req, res) => {
  const { fullName, phoneNumber, email, dob } = req.body
  // Validate input
  const validationErrors = validateInput({ fullName, phoneNumber, email });
  if (Object.keys(validationErrors).length) {
    return res.status(STATUS_CODE.BAD_REQUEST).json({ errors: validationErrors, message: ResponseMessage.ERROR.AUTHENTICATION.INSUFFICENT_CREDENTIALS });
  }
  try {
    console.log()
    const userData = await getData(email);
    console.log(userData)
    const userDetails = { ...userData, fullName, phoneNumber, dob };

    const user = new User({ ...userDetails });
    await user.save();

    res
      .status(STATUS_CODE.SUCCESS_OK)
      .json({ message: ResponseMessage.SUCCESS.AUTHENTICATION.REGISTRATION });


  } catch (error) {
    console.log(error.message);
    res.status(STATUS_CODE.GATEWAY_TIMEOUT).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR });
  }
}

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS });
    }
    const isMatchPassword = await comparePassword(password, user.password);

    if (!isMatchPassword) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS })
    }

    if(user.role == 'admin'){
      return res
      .status(404)
      .json({message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS});
    }

    if (user.isBlock) {
      return res.status(STATUS_CODE.UNAUTHORIZED).json({ message: ResponseMessage.ERROR.AUTHORIZATION.USER_BAN })
    }
    const accessToken = await generateAccessToken(user._id, user.role);
    const refreshToken = await generateRefreshToken(user._id, user.role);

    user.refreshToken = refreshToken;
    await user.save();
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })


    res
      .status(STATUS_CODE.SUCCESS_OK)
      .json({ message: ResponseMessage.SUCCESS.AUTHENTICATION.LOGIN, accessToken, username: user.username });

  } catch (error) {
    console.log(error)
    res.status(STATUS_CODE.GATEWAY_TIMEOUT).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR });
  }
}


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

const resetPasswordEmail = async (req, res) => {
  const { email } = req.body;
  console.log(email, req.body)
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(STATUS_CODE.NOT_FOUND).json({ message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS });
    }
    const otp = genrateOtp(7);
    storeOtp(email, JSON.stringify(otp));
    sendOtpToEmail(email, otp);
    res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.AUTHENTICATION.OTP_SEND });
  } catch (error) {
    return res.status(STATUS_CODE.GATEWAY_TIMEOUT).json({ message: error.message });
  }
}

const resetPassword = async (req, res) => {
  const { password, email } = req.body;
  try {
    const user = await User.findOne({ email })
    const securedPassword = await hashPassword(password);
    user.password = securedPassword;
    await user.save();

    res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.UPDATED })

  } catch (error) {
    return res.status(STATUS_CODE.GATEWAY_TIMEOUT).json({ message: ResponseMessage.ERROR.INTERNET_SERVER_ERROR });
  }


}

const logout = async (req, res) => {
  res.clearCookie('refreshToken');
  console.log(req.cookies, res.cookies)
  res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.AUTHENTICATION.LOGOUT })

}

const suggesstingUser = async (req, res) => {
  try {
    const { userId } = req.user; // Get current user ID from req.user
    const userIDObject = new mongoose.Types.ObjectId(userId);

    const response = await User.aggregate([
      // Lookup to check if the user is followed by the current user
      {
        $lookup: {
          from: "follows", // Name of your 'follows' collection
          localField: "_id",
          foreignField: "following",
          as: "isFollowed",
        },
      },
      {
        $addFields: {
          isFollowedByUser: {
            $in: [userIDObject, "$isFollowed.follower"], // Check if current user follows
          },
        },
      },

      // Lookup to check if the user is blocked
      {
        $lookup: {
          from: "blocks", // Name of your 'blocks' collection
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$blockerId", "$$userId"] }, // Blocker is the current user
                    { $eq: ["$blockedId", userIDObject] }, // Current user is blocked
                  ],
                },
              },
            },
          ],
          as: "blockedByUser",
        },
      },
      {
        $addFields: {
          isBlockedByUser: { $gt: [{ $size: "$blockedByUser" }, 0] }, // If entries exist, user is blocked
        },
      },

      // Lookup to get the count of posts for the user
      {
        $lookup: {
          from: "posts", // Name of your 'posts' collection
          localField: "_id",
          foreignField: "userID",
          as: "userPosts",
        },
      },
      {
        $addFields: {
          postCount: { $size: "$userPosts" }, // Count the user's posts
        },
      },

      // Filter out users who are already followed, blocked, or the current user
      {
        $match: {
          isFollowedByUser: false, // Exclude already-followed users
          isBlockedByUser: false, // Exclude blocked users
          role: { $ne: "admin" }, // Exclude admins
          _id: { $ne: userIDObject }, // Exclude the current user
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

      // Sort by post count and followers count (optional if 'followersCount' exists)
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
  try {
    if (!username) {
      [user, followersCount, followingsCount, postCount] = await Promise.all([
        User.findById(userId, 'username fullName profileImage bio gender post  '),
        Follow.countDocuments({ following: userId }),
        Follow.countDocuments({ follower: userId }),
        Post.find({userID: userId}).countDocuments(),
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

      [followersCount, followingsCount, isFollowed, postCount] = await Promise.all([
        Follow.countDocuments({ following: user._id }),
        Follow.countDocuments({ follower: user._id }),
        Follow.exists({ follower: userId, following: user._id }),
        Post.find({userID: user._id}).countDocuments(),
      ])

    }


    if (!user) {
      return res.status(STATUS_CODE.NOT_FOUND).json({ message: ResponseMessage.ERROR.NOT_FOUND})
    }




    if (user && user.profileImage) {
      const profileImage = await generatePreSignedUrlForProfileImageS3(user.profileImage);
      return res.status(STATUS_CODE.SUCCESS_OK).json({
        user: {
          ...user.toObject(),
          profileImage,
          postCount,
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
  sendotp,
  otpVerification,
  register,
  login,
  refreshAccessToken,
  logout,
  resetPassword,
  resetPasswordEmail,
  suggesstingUser,
  userDetails,
  updateProfile,
  toggleFollow,
  aboutProfile,
}