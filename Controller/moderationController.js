const { STATUS_CODE } = require('../Config/enum');
const { ResponseMessage } = require('../Constants/messageConstants');
const Report = require('../Model/reportModel')
const Restrict = require('../Model/restrictModel')
const Block = require('../Model/blockModel');
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

    try {
        const [response, totalCount] = await Promise.all([
            Report.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            reportedId: "$reportedId",
                            type: "$reportType",
                        },
                        reportCount: { $sum: 1 },
                        createdAt: { $first: "$createdAt" },
                        status: { $first: "$status" },
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "_id.reportedId",
                        foreignField: "_id",
                        as: "reportedUserDetails",
                    },
                },
                { $unwind: { path: "$reportedUserDetails", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "posts",
                        localField: "_id.reportedId",
                        foreignField: "_id",
                        as: "reportedPostDetails",
                    },
                },
                { $unwind: { path: "$reportedPostDetails", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: "$_id.reportedId",
                        reportCount: 1,
                        type: "$_id.type",
                        status: 1,
                        details: {
                            $cond: {
                                if: { $eq: ["$_id.type", "post"] },
                                then: {
                                    caption: "$reportedPostDetails.caption",
                                    fileName: { $ifNull: ["$reportedPostDetails.fileName", null] },
                                    uploadDate: "$reportedPostDetails.uploadDate",
                                    status: { $ifNull: ["$reportedPostDetails.status", "unknown"] },
                                    postId: "$reportedPostDetails._id",
                                },
                                else: {
                                    username: "$reportedUserDetails.username",
                                    email: "$reportedUserDetails.email",
                                    profileImage: { $ifNull: ["$reportedUserDetails.profileImage", null] },
                                    status: { $ifNull: ["$reportedUserDetails.status", "unknown"] },
                                },
                            },
                        },
                        createdAt: 1,
                    },
                },
                { $skip: skip },
                { $limit: Number(limit) },
            ]),
            Report.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: { reportedId: "$reportedId", postId: "$postId" },
                    },
                },
                { $count: "totalCount" },
            ]),
        ]);

        const reportDetails = await Promise.all(
            response.map(async (report) => {
                try {
                    if (report.details.fileName) {
                        report.details.fileName = await getCachedPostUrl(
                            report._id,
                            report.details.fileName
                        );
                    } else {
                        report.details.profileImage = await getCachedProfileImageUrl(
                            report._id,
                            report.details.profileImage
                        );
                    }
                    report.actions = await reportActionButton(report.status);
                    return report;
                } catch (error) {
                    console.error(`Error processing report ID ${report._id}:`, error);
                    return null; // Skip this report
                }
            })
        );

        const filteredReports = reportDetails.filter((report) => report !== null);

        const totalPage = totalCount.length > 0 ? Math.ceil(totalCount[0].totalCount / limit) : 1;

        res.status(STATUS_CODE.SUCCESS_OK).json({
            reportDetails: filteredReports,
            totalPage,
            currentPage: page,
            message: ResponseMessage.SUCCESS.OK,
        });
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODE.SERVER_ERROR).json({
            message: ResponseMessage.ERROR.INTERNAL_SERVER_ERROR,
        });
    }
};

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
