const express = require('express');
const userModel = require('../models/user');
const reportModel = require('../models/report');
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
        res.status(500).json({ message: 'error', error: "Something went wrong while rejecting the ad" });
        console.log(e);
    }
});



module.exports = router;
