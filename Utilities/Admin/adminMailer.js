const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});


async function sendMail(email, subject, text, html) {
    try {
        let info;
        html ?
            info = await transporter.sendMail({
                from: '"Verbatica" <verbatica2025@gmail.com>',
                to: email,
                subject: subject,
                html: html
            }) :
            info = await transporter.sendMail({
                from: '"Verbatica" <verbatica2025@gmail.com>',
                to: email,
                subject: subject,
                text: text
            });


        console.log('Message sent:', info.messageId);
    } catch (error) {
        console.error('Failed to send OTP:', error);
    }
}

module.exports = { sendMail };