const { STATUS_CODE } = require('../Config/enum');
const { ResponseMessage } = require('../Constants/messageConstants');
const Report = require('../Model/reportModal')
const Restrict = require('../Model/restrictModal')
const Block = require('../Model/blockModal');
const { getCachedPostUrl, getCachedProfileImageUrl } = require('../Config/redis');
const { reportActionButton } = require('../library/filteration');
const { convertStringToObjectID } = require('../services/MongoDb/mongooseAction');


const userStatus = async (req, res) => {
    const { userId } = req.query;
    const currentUserId = req.user.userId;
    // console.log('is here', currentUserId, restrictedUserId)
    try {
        const [isRestricted, isBlocked] = await Promise.all([
            Restrict.exists({
                restrictedBy: currentUserId,
                restrictedUser: userId,
            }),
            Block.exists({
                blockerId: currentUserId,
                blockedId: userId
            })
        ])


        // const isRestricted = response ? true : false;
        console.log('shit', isRestricted, isBlocked)


        return res.status(STATUS_CODE.SUCCESS_OK).json({ isRestricted: !!isRestricted, isBlocked: !!isBlocked, message: ResponseMessage.SUCCESS.OK })
    } catch (error) {

    }
}

const toggleRestrict = async (req, res) => {
    const { restrictedUser } = req.body;
    const currentUserId = req.user.userId;
    console.log(restrictedUser, currentUserId, 'okay naah..')
    try {
        const isRestricted = await Restrict.findOne({
            restrictedBy: restrictedUser,
            restrictedBy: currentUserId,
        })
        console.log(isRestricted, 'ith vanna');
        if (isRestricted) {
            const response = await Restrict.findByIdAndDelete(isRestricted._id);;
            console.log('unRestrict', response);
            return res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.OK })

        }
        const restriction = new Restrict({
            restrictedBy: currentUserId,
            restrictedUser: restrictedUser,

        })
        await restriction.save();
        console.log('kona vanna')
        return res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.OK })

    } catch (error) {
        console.log(error);

    }
}

const reportUser = async (req, res) => {
    const { userId, message } = req.body;
    const currentUserId = req.user.userId;
    console.log(userId, message, currentUserId);

    const report = new Report({
        reporterId: currentUserId,
        reportMessage: message,
        reportedId: userId,
        reportType: 'user',
    })
    await report.save();
    res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.OK })
}

const toggleBlock = async (req, res) => {
    const { userId } = req.body;
    const currentUser = req.user.userId;

    const isBlocked = await Block.findOne({
        blockerId: currentUser,
        blockedId: userId
    });

    if (isBlocked) {
        await Block.findByIdAndDelete(isBlocked._id);
        return res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.OK })
    }
    const block = new Block({
        blockerId: currentUser,
        blockedId: userId,
    });
    await block.save()
    return res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.OK })
}

const getProfileLink = async (req, res) => {
    const { username } = req.query;

}

const reportPost = async (req, res) => {
    const { userId, postId, message } = req.body;
    const currentUserId = req.user.userId;

    const report = new Report({
        reporterId: currentUserId,
        reportedId: postId,
        reportMessage: message,
        reportType: 'post',

    })


    await report.save();
    res.status(STATUS_CODE.SUCCESS_OK).json({ message: ResponseMessage.SUCCESS.OK });
}

const getAllReportDetials = async (req, res) => {

    const { search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const searchData = search?.trim()?.replace(/[^a-zA-Z\s]/g, "");

    const matchStage = searchData
        ? { reportMessage: { $regex: searchData, $options: "i" } }
        : {};


    const [response, totalCount] = await Promise.all([
        Report.aggregate([
            {
                $match: matchStage // Filtering conditions, e.g., search, status
            },

            // Group by reportedId and aggregate reports
            {
                $group: {
                    _id: {
                        reportedId: "$reportedId",
                        type: "$reportType", // Group by report type as well
                    },
                    reportCount: { $sum: 1 }, // Count the number of reports
                    createdAt: { $first: "$createdAt" }, // Use the first createdAt for reference
                    status: { $first: '$status' },
                },
            },

            // Fetch user details if the report is about a user
            {
                $lookup: {
                    from: "users",
                    localField: "_id.reportedId", // The reported user ID
                    foreignField: "_id",
                    as: "reportedUserDetails",
                },
            },
            {
                $unwind: {
                    path: "$reportedUserDetails",
                    preserveNullAndEmptyArrays: true, // Allow null in case type is post
                },
            },

            // Fetch post details if the report is about a post
            {
                $lookup: {
                    from: "posts",
                    localField: "_id.reportedId", // The reported post ID
                    foreignField: "_id",
                    as: "reportedPostDetails",
                },
            },
            {
                $unwind: {
                    path: "$reportedPostDetails",
                    preserveNullAndEmptyArrays: true, // Allow null in case type is user
                },
            },

            // Project the desired fields with conditional logic for type
            {
                $project: {
                    _id : '$_id.reportedId',
                    reportCount: 1, // Total number of reports
                    type: "$_id.type", // Report type: User or Post
                    status: 1,
                    details: {
                        $cond: {
                            if: { $eq: ["$_id.type", "post"] }, // Check if it's a post
                            then: {
                                caption: "$reportedPostDetails.caption",
                                fileName: "$reportedPostDetails.fileName",
                                uploadDate: "$reportedPostDetails.uploadDate",
                                status: "$reportedPostDetails.status",
                                postId: "$reportedPostDetails._id",
                            },
                            else: {
                                username: "$reportedUserDetails.username",
                                email: "$reportedUserDetails.email",
                                profileImage: "$reportedUserDetails.profileImage",
                                status: "$reportedUserDetails.status",
                            },
                        },
                    },
                    createdAt: 1, // Include the createdAt field
                },
            },

            // Optionally, add pagination
            { $skip: skip },
            { $limit: Number(limit) },
        ]),

        // Total count of unique reported users/posts
        Report.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        reportedId: "$reportedId",
                        postId: "$postId",
                    },
                },
            },
            { $count: "totalCount" },
        ]),
    ]);

    console.log(response)


    const reportDetails = await Promise.all(
        response.map(async (report) => {
            if (report?.details?.fileName) {
                report.details.fileName = await getCachedPostUrl(report._id.reportedId, report.details.fileName)
            } else {
                report.details.profileImage = await getCachedProfileImageUrl(report._id.reportedId, report.details.profileImage)
            }

            report.actions = await reportActionButton(report.status)

            return report
        })
    )


    //    console.log(reportDetails)

    const totalPage = Math.ceil(totalCount[0].totalCount / limit);
    console.log(reportDetails, totalPage);

    res.status(STATUS_CODE.SUCCESS_OK).json({
        reportDetails,
        totalPage,
        currentPage: page,
        message: ResponseMessage.SUCCESS.OK,
    })
}

const getReportDetails = async (req, res) => {
    const {reportId} = req.query;
    
    const id = await convertStringToObjectID(reportId)
    const reports = await Report.aggregate([
        {
            $match: {
                reportedId: id,
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'reporterId',
                foreignField: '_id',
                as: 'reporterDetails'
            },
        },
        {
            $unwind: {
                path: '$reporterDetails',
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $project: {
                _id: 1,
                username: '$reporterDetails.username',
                status: 1,
                reportMessage: 1,
            },
        },
    ]);


    res.status(STATUS_CODE.SUCCESS_OK).json({
        message: ResponseMessage.SUCCESS.OK,
        reports
    })
    


}

const updateReportStatus = async (req, res) => {
    const { reportId, action } = req.body;
    console.log(reportId, action)

    const response = await Report.findByIdAndUpdate(reportId, {
        status: action.toLowerCase(),
    }, {new: true});


    res.status(STATUS_CODE.SUCCESS_OK).json({message: ResponseMessage.SUCCESS.OK})

}

module.exports = {
    userStatus,
    toggleRestrict,
    reportUser,
    toggleBlock,
    getProfileLink,
    reportPost,
    getAllReportDetials,
    getReportDetails,
    updateReportStatus,
}
