// authController.js or wherever you handle auth
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.SERVERID);

async function verifyGoogleToken(idToken) {

    if (!idToken) throw new Error('No token found');

    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.SERVERID, // same as above
        });

        const payload = ticket.getPayload();

        // Now you can access user info:
        const { email } = payload;

        return email
    } catch (error) {
        console.error('Token verification failed:', error);
        throw new Error(error);
    }
}

module.exports = { verifyGoogleToken }
