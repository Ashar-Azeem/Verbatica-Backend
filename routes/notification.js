const express = require('express');
const router = express.Router();
const notificationModel = require('../models/notification');

router.get('/getNotification', async (req, res) => {
    try {
        const { userId } = req.body;

        const notifications = await notificationModel.getNotificationsForUser(userId);

        return res.status(200).json({
            message: 'successfull',
            notifications: notifications
        });

    } catch (e) {
        console.log(e);
        return res.status(500).json({
            message: 'error',
            error: "Something went wrong while uploading the notification"
        });
    }
});

router.put('/markAsReadNotification', async (req, res) => {
    try {
        const { notificationIds } = req.body;
        const status = await notificationModel.markNotificationsAsRead(notificationIds);
        return res.status(200).json({
            message: 'successfull',
            status: status
        });

    } catch (e) {
        console.log(e);
        return res.status(500).json({
            message: 'error',
            error: "Something went wrong while marking read on notifications"
        });
    }
});
router.delete('/notifications', async (req, res) => {
    try {
        const { notificationIds } = req.body;
        const status = await notificationModel.deleteNotifications(notificationIds);
        return res.status(200).json({
            message: 'successfull',
            status: status
        });

    } catch (e) {
        console.log(e);
        return res.status(500).json({
            message: 'error',
            error: "Something went wrong while deleting the notifications"
        });
    }
});

module.exports = router;