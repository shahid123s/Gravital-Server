const { STATUS_CODE } = require('../Config/enum');
const { ResponseMessage } = require('../Constants/messageConstants');
const Report = require('../Model/reportModal')
const Restrict = require('../Model/restrictModal')
const Block = require('../Model/blockModal');

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
        reportedId: userId,
        reportMessage: message,
        reportType: 'post',
        postId,
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


    const [reportDetails, totalCount] = await Promise.all([
        Report.aggregate([
            { $match: matchStage }, // Match based on filters (e.g., date, status)

            // Group by reportedId (user) or postId (post) and count reports
            {
                $group: {
                    _id: {
                        reportedId: "$reportedId",
                        postId: "$postId",
                    },
                    reportCount: { $sum: 1 }, // Count how many times reported
                    createdAt: { $first: "$createdAt" }, // Keep the creation date
                },
            },

            // Fetch details of the reported user
            {
                $lookup: {
                    from: "users",
                    localField: "_id.reportedId",
                    foreignField: "_id",
                    as: "reportedUserDetails",
                },
            },
            {
                $unwind: {
                    path: "$reportedUserDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },

            // Fetch details of the reported post
            {
                $lookup: {
                    from: "posts",
                    localField: "_id.postId",
                    foreignField: "_id",
                    as: "reportedPostDetails",
                },
            },
            {
                $unwind: {
                    path: "$reportedPostDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },

            // Determine the type (user or post) and project only relevant details
            {
                $project: {
                    reportCount: 1, // Total reports
                    type: {
                        $cond: {
                            if: { $ne: ["$_id.postId", null] },
                            then: "Post",
                            else: "User",
                        },
                    },
                    details: {
                        $cond: {
                            if: { $ne: ["$_id.postId", null] },
                            then: {
                                caption: "$reportedPostDetails.caption",
                                fileName: "$reportedPostDetails.fileName",
                                uploadDate: "$reportedPostDetails.uploadDate",
                                status: "$reportedPostDetails.status", // Assuming posts have a status field
                                postId: "$reportedPostDetails._id",
                            },
                            else: {
                                username: "$reportedUserDetails.username",
                                email: "$reportedUserDetails.email",
                                profileImage: "$reportedUserDetails.profileImage",
                                status: "$reportedUserDetails.status", // Assuming users have a status field
                            },
                        },
                    },
                    createdAt: 1,
                },
            },

            // Pagination
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

    const totalPage = Math.ceil(totalCount[0].totalCount / limit);
    console.log(reportDetails, totalPage);

    res.status(STATUS_CODE.SUCCESS_OK).json({
        reportDetails,
        totalPage,
        currentPage: page,
        message: ResponseMessage.SUCCESS.OK,
    })
}

module.exports = {
    userStatus,
    toggleRestrict,
    reportUser,
    toggleBlock,
    getProfileLink,
    reportPost,
    getAllReportDetials,
}
