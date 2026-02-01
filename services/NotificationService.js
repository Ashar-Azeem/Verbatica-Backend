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
const sendE2EENotification = async (userToken, cypherText, public_key, senderUserName) => {

    const message = {
        //  Data-only payload: This ensures the Android OS stays silent and lets your Flutter code handle the "Reveal".
        data: {
            type: 'encrypted_chat',
            payload: cypherText,
            publicKey: public_key,
            title: senderUserName,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
            priority: 'high',
            ttl: 3600 * 1000
        },
        token: userToken
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent E2EE message to Verbatica user:', response);
        return response;
    } catch (error) {
        console.error('Error sending E2EE message:', error);

        if (error.code === 'messaging/registration-token-not-registered') {
            console.log(`FCM Token ${userToken} is no longer valid. Remove it from your database.`);
        }
        throw error;
    }
};

module.exports = { sendPushNotification, sendE2EENotification };