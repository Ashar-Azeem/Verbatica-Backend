const express = require('express');
const userModel = require('../models/user');
const adsModel = require('../models/ad');
const reportModel = require('../models/report');
const postModel = require('../models/post');
const mailSender = require('../Utilities/Admin/adminMailer');

const router = express.Router();
router.get('/usersForAdminPannel', async (req, res) => {
    try {
        const { page } = req.query;
        const users = await userModel.getUsers(page);

        return res.status(200).json({ message: 'successfull', users: users });


    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the users" });
    }
});

router.get('/reportedUsers', async (req, res) => {
    try {
        const { page } = req.query;
        const reports = await reportModel.getUserReports(page);

        return res.status(200).json({ message: 'successfull', reports: reports });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the reported users" });
    }
});

router.put('/ActionOnUserReportByAdmin', async (req, res) => {
    try {
        const { reportId, reportedUserEmail, reportedUserName, status, reason } = req.body;
        if (status === "rejected") {
            await reportModel.updateReportStatus(reportId, status, reason);
        } else {
            await reportModel.updateReportStatus(reportId, status, reason);
            await userModel.deleteUser(reportedUserEmail);
            await mailSender.sendMail(
                reportedUserEmail,
                "Your Account Has Been Permanently Deleted",
                null,
                `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <p>Dear ${reportedUserName},</p>

                    <p>
                        We are writing to inform you that, after a thorough review of your account activity, 
                        your account on <strong>Verbatica</strong> has been <strong>permanently deleted</strong> 
                        due to violations of our community guidelines and terms of service.
                    </p>

                    <p>
                        <strong>Reason for account deletion:</strong><br>
                        <span style="color: #d9534f;">${reason}</span>
                    </p>

                    <p>
                        This action is <strong>irreversible</strong>. You will no longer have access to your account, 
                        its content, or any associated data.
                    </p>

                    <p>
                        If you believe this action was taken in error or have any questions, 
                        please contact our support team at 
                        <a href="mailto:verbatica2025@gmail.com">verbatica2025@gmail.com</a>.
                    </p>

                    <p>
                        We take the safety and well-being of our community seriously, 
                        and we appreciate your understanding.
                    </p>

                    <p>Sincerely,<br>The Verbatica Team</p>
                </div>
                      `
            );

        }
        return res.status(200).json({ message: "successful" });


    } catch (e) {
        res.status(500).json({ message: 'error', error: "Something went wrong while updating the status of a report" });
        console.log(e);
    }
});

router.get('/reportedPost', async (req, res) => {
    try {
        const reports = await reportModel.getPostReports();
        return res.status(200).json({ message: 'successfull', reports: reports });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the reported post" });
    }
});

router.put('/ActionOnPostReportByAdmin', async (req, res) => {
    try {
        const { reportId, reportedUserEmail, reportedUserName, postId, postTitle, status, reason } = req.body;

        if (status === "rejected") {
            await reportModel.updateReportStatus(reportId, status, reason);
        } else {
            await reportModel.updateReportStatus(reportId, status, reason);
            await postModel.deletePost(postId);
            await mailSender.sendMail(
                reportedUserEmail,
                "Your Post Has Been Removed",
                null,
                `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <p>Dear ${reportedUserName},</p>

                        <p>
                            We are writing to inform you that one of your posts on <strong>Verbatica</strong> 
                            has been <strong>removed</strong> following a review by our moderation team.
                        </p>

                        ${postTitle
                    ? `<p><strong>Post Title:</strong> ${postTitle}</p>`
                    : ""
                }

                        <p>
                            <strong>Reason for removal:</strong><br>
                            <span style="color: #d9534f;">${reason}</span>
                        </p>

                        <p>
                            Please note that repeated violations may lead to further actions against your account, 
                            including permanent deletion.
                        </p>

                        <p>
                            If you believe this was a mistake, feel free to reach out to our support team at 
                            <a href="mailto:verbatica2025@gmail.com">verbatica2025@gmail.com</a>.
                        </p>

                        <p>
                            We appreciate your cooperation in keeping the community safe and respectful.
                        </p>

                        <p>Sincerely,<br>The Verbatica Team</p>
                    </div>
                    `
            );

        }
        return res.status(200).json({ message: "successful" });

    } catch (e) {
        res.status(500).json({ message: 'error', error: "Something went wrong while updating the status of a report" });
        console.log(e);
    }
});


router.get('/reportedComment', async (req, res) => {
    try {
        const comments = await reportModel.getAllCommentReports();
        return res.status(200).json({ message: 'successfull', comments: comments });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the reported comments" });
    }
});

router.put('/ActionOnCommentReportByAdmin', async (req, res) => {
    try {
        const { reportId, reportedUserEmail, reportedUserName, commentId, commentText, status, reason } = req.body;
        if (status === "rejected") {
            await reportModel.updateReportStatus(reportId, status, reason);
        } else {
            await reportModel.updateReportStatusOfComment(reportId, status, reason);
            await reportModel.deleteCommentCascade(commentId);
            await mailSender.sendMail(
                reportedUserEmail,
                "Your Comment Has Been Removed",
                null,
                `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <p>Dear ${reportedUserName},</p>

                        <p>
                            We are writing to inform you that one of your comments on <strong>Verbatica</strong> 
                            has been <strong>removed</strong> following a review by our moderation team.
                        </p>

                        ${commentText
                    ? `<p><strong>Comment:</strong> ${commentText}</p>`
                    : ""
                }

                        <p>
                            <strong>Reason for removal:</strong><br>
                            <span style="color: #d9534f;">${reason}</span>
                        </p>

                        <p>
                            Please note that repeated violations may lead to further actions against your account, 
                            including permanent deletion.
                        </p>

                        <p>
                            If you believe this was a mistake, feel free to reach out to our support team at 
                            <a href="mailto:verbatica2025@gmail.com">verbatica2025@gmail.com</a>.
                        </p>

                        <p>
                            We appreciate your cooperation in keeping the community safe and respectful.
                        </p>

                        <p>Sincerely,<br>The Verbatica Team</p>
                    </div>
                    `
            );

        }
        return res.status(200).json({ message: "successful" });

    } catch (e) {
        res.status(500).json({ message: 'error', error: "Something went wrong while updating the status of a report" });
        console.log(e);
    }
});
router.get('/ads', async (req, res) => {
    try {
        const { status } = req.query;
        const ads = await adsModel.getAdsForAdminByStatus(status);
        return res.status(200).json({ message: 'successfull', ads: ads });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: `Something went wrong while fetching the ${req.params.status} Ads` });
    }
});

router.put('/changeAdsStatus', async (req, res) => {
    try {
        const { adId, status, email, name, title, reason } = req.body;

        const result = await adsModel.updateAdStatus(adId, status);
        if (status === "rejected") {
            await mailSender.sendMail(
                email,
                "Your Ad Has Been Rejected",
                null,
                `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <p>Dear ${name},</p>

                    <p>
                        We are writing to inform you that one of your ads on <strong>Verbatica</strong> 
                        has been <strong>rejected</strong> following a review by our moderation team.
                    </p>

                    <p><strong>Ad Title:</strong> ${title}</p>

                    <p>
                        <strong>Reason for rejection:</strong><br>
                        <span style="color: #d9534f;">${reason}</span>
                    </p>

                    <p>
                        To have your ad approved, please edit it to meet our platform requirements and guidelines.
                        Once updated, you can resubmit it for review.
                    </p>

                    <p>
                        If you have any questions or need clarification regarding the rejection, 
                        please contact our support team at 
                        <a href="mailto:verbatica2025@gmail.com">verbatica2025@gmail.com</a>.
                    </p>

                    <p>
                        We appreciate your understanding and cooperation in maintaining a safe and high-quality marketplace.
                    </p>

                    <p>Sincerely,<br>The Verbatica Team</p>
                </div>
                `
            );
        }
        return res.status(200).json({ message: 'successfull', isUpdated: result });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: `Something went wrong while updating the Ad status` });
    }
});



router.get("/analytics", async (req, res) => {
    const commentModel = require("../models/comment");
    const connectAll = require('../Utilities/cloud/ConnectionToCloudResources');
    const { postgres } = await connectAll();

    try {

        const totalUsersRes = await postgres.query(`SELECT COUNT(*)::int AS count FROM users`);
        const totalUsers = totalUsersRes.rows[0].count;


        const totalPostsRes = await postgres.query(`SELECT COUNT(*)::int AS count FROM posts`);
        const totalPosts = totalPostsRes.rows[0].count;

        const pendingReportsRes = await postgres.query(`
            SELECT COUNT(*)::int AS count 
            FROM report 
            WHERE report_status = 'pending'
        `);
        const pendingReports = pendingReportsRes.rows[0].count;

        const pendingAdsRes = await postgres.query(`
            SELECT COUNT(*)::int AS count 
            FROM ads 
            WHERE status = 'pending'
        `);
        const pendingAds = pendingAdsRes.rows[0].count;

        const pendingApprovals = pendingReports + pendingAds;

        const liveAdsRes = await postgres.query(`
            SELECT COUNT(*)::int AS count 
            FROM ads 
            WHERE status = 'approved'
        `);
        const liveAds = liveAdsRes.rows[0].count;


        const kpiData = [
            { title: "Total Users", value: totalUsers },
            { title: "Total Posts", value: totalPosts },
            { title: "Pending Approvals", value: pendingApprovals },
            { title: "Live Ads", value: liveAds }
        ];


        const userGrowthRes = await postgres.query(`
            SELECT 
                TO_CHAR(DATE_TRUNC('month', "joinDate"), 'Mon') AS month,
                COUNT(*)::int AS total
            FROM users
            GROUP BY DATE_TRUNC('month', "joinDate")
            ORDER BY DATE_TRUNC('month', "joinDate") ASC
            LIMIT 6
        `);

        const userGrowthData = userGrowthRes.rows.map(r => ({
            name: r.month,
            Total: r.total,
        }));


        const weekRanges = [];
        const today = new Date();
        const day = today.getDay();
        const mondayOffset = (day === 0) ? -6 : (1 - day);
        const thisWeekMonday = new Date(today);
        thisWeekMonday.setDate(today.getDate() + mondayOffset);
        thisWeekMonday.setHours(0, 0, 0, 0);

        for (let i = 3; i >= 0; i--) {
            const start = new Date(thisWeekMonday);
            start.setDate(thisWeekMonday.getDate() - (i * 7));
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            weekRanges.push({ start, end });
        }

        const likesPromises = weekRanges.map(w => {
            return postgres.query(
                `SELECT COUNT(*)::int AS likes
                 FROM post_votes
                 WHERE value = true
                 AND voting_date >= $1 
                 AND voting_date < $2`,
                [w.start, w.end]
            );
        });
        const likesRes = await Promise.all(likesPromises);

        const commentsPromises = weekRanges.map(w => {
            return commentModel.countDocuments({
                uploadTime: { $gte: w.start, $lt: w.end }
            });
        });
        const commentsCounts = await Promise.all(commentsPromises);

        const engagementData = weekRanges.map((w, idx) => ({
            name: `Week ${idx + 1}`,
            Likes: likesRes[idx].rows[0].likes,
            Comments: commentsCounts[idx]
        }));


        const reportRes = await postgres.query(`
            SELECT report_content AS type, COUNT(*)::int AS count
            FROM report
            GROUP BY report_content
        `);

        const reportData = reportRes.rows.map(r => ({
            name: r.type,
            value: r.count
        }));


        const adsRes = await postgres.query(`
            SELECT status, COUNT(*)::int AS count
            FROM ads
            GROUP BY status
        `);

        const adData = adsRes.rows.map(r => ({
            name: r.status,
            value: r.count
        }));


        res.json({
            kpiData,
            userGrowthData,
            engagementData,
            reportData,
            adData
        });

    } catch (err) {
        console.error("Analytics error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});





module.exports = router;
