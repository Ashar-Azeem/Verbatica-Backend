const admin = require("firebase-admin");
const serviceAccount = require("../verbatica-9c4ef-firebase-adminsdk-fbsvc-060ee8a8aa.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const sendPushNotification = async (userToken, title, body) => {
    const message = {
        notification: {
            title: title,
            body: body,
        },
        data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            type: 'comment_update',
            route: '/comments-page'
        },
        token: userToken,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
    } catch (error) {
        console.log('Error sending message:', error);
    }
};

module.exports = sendPushNotification;