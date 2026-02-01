const connectAll = require('../Utilities/cloud/ConnectionToCloudResources');
const sendPushNotification = require('../services/NotificationService');
const userModel = require('./user');
const notificationModel = {
    async addNotification(
        postId,
        commentId,
        senderId,
        receiverId,
        isPostNotification,
        isCommentNotification,
        isUpvoteNotification,
        isReplyNotification,
        title,
        description,
    ) {
        try {
            const { postgres } = await connectAll();

            const query = `
            INSERT INTO notification (
                post_id,
                comment_id,
                sender_id,
                receiver_id,
                is_post_notification,
                is_comment_notification,
                is_upvote_notification,
                is_reply_notification,
                title,
                description,
                created_at,
                is_read
            )
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `;

            const values = [
                postId,
                commentId,
                senderId,
                receiverId,
                isPostNotification,
                isCommentNotification,
                isUpvoteNotification,
                isReplyNotification,
                title,
                description,
                new Date(),
                false,
            ];

            await postgres.query(query, values);
            const receivingUser = await userModel.getUserViaId(receiverId);
            if (receivingUser && receivingUser.fcm_token) {
                await sendPushNotification.sendPushNotification(
                    receivingUser.fcm_token,
                    title,
                    description
                );
            }
        } catch (e) {
            console.log(e);
            throw e;
        }

    },
    async getNotificationsForUser(userId) {
        const { postgres } = await connectAll();

        const query = `
        SELECT 
            n.notification_id,
            n.post_id,
            n.comment_id,
            sender."userName" AS sender_username,
            receiver."userName" AS receiver_username,
            sender."avatarId" AS avatar_id,
            n.is_post_notification,
            n.is_comment_notification,
            n.is_upvote_notification,
            n.is_reply_notification,
            n.title,
            n.description,
            n.created_at,
            n.is_read
        FROM notification n
        JOIN users sender ON sender.id = n.sender_id
        JOIN users receiver ON receiver.id = n.receiver_id
        WHERE n.receiver_id = $1
        ORDER BY n.created_at DESC;
    `;
        try {
            const result = await postgres.query(query, [userId]);
            return result.rows;
        } catch (err) {
            console.error("Error fetching notifications:", err);
            throw err;
        }
    },
    async markNotificationsAsRead(notificationIds) {
        const { postgres } = await connectAll();

        const query = `
        UPDATE notification
        SET is_read = TRUE
        WHERE notification_id = ANY($1::int[]);
    `;

        try {
            const result = await postgres.query(query, [notificationIds]);
            return result.rowCount > 0;
        } catch (err) {
            console.error("Error marking notifications as read:", err);
            return false;
        }
    }, async deleteNotifications(notificationIds) {
        const { postgres } = await connectAll();

        const query = `
        DELETE FROM notification
        WHERE notification_id = ANY($1::int[]);
    `;

        try {
            const result = await postgres.query(query, [notificationIds]);
            return result.rowCount > 0;
        } catch (err) {
            console.error("Error marking notifications as read:", err);
            return false;
        }
    },

    async sendMessagesNotification(userId, senderPublicKey, senderUserName, cypherText) {
        const user = await userModel.getUserViaId(userId);

        if (user && user.fcm_token) {
            try {
                await sendPushNotification.sendE2EENotification(
                    user.fcm_token,
                    cypherText,
                    senderPublicKey,
                    senderUserName
                );
            } catch (error) {
                console.error("Failed to send E2EE notification:", error);
            }
        }
    }


}


module.exports = notificationModel;