const express = require('express');
const router = express.Router();
const reportModel = require('../models/report');


router.post('/uploadReport', async (req, res) => {
    try {
        const { reporterUserId, isPostReport, isCommentReport, isUserReport, postId, commentId, reportedUserId,
            reportContent, reportTime } = req.body;

        const report = await reportModel.addReport(reporterUserId, isPostReport, isCommentReport, isUserReport,
            postId, commentId, reportedUserId, reportContent, reportTime);

        res.status(200).json({ message: "successful", report: report });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while uploading the report" });
    }
});

router.get('/fetchReports', async (req, res) => {
    try {
        const { userId } = req.body;
        const reports = await reportModel.getReportsByReporter(userId);
        res.status(200).json({ message: "successful", reports: reports });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the reports" });
    }
});






module.exports = router;