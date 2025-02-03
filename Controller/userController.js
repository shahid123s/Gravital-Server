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






module.exports = {
  refreshAccessToken,
}