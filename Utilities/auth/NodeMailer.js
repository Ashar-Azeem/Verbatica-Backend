const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});


async function sendOTP(email, otp) {
    try {
        const info = await transporter.sendMail({
            from: '"Verbatica" <verbatica2025@gmail.com>',
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is: ${otp}.`
        });

        console.log('Message sent:', info.messageId);
    } catch (error) {
        console.error('Failed to send OTP:', error);
    }
}

module.exports = { sendOTP };