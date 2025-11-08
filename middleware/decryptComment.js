const crypto = require('crypto');

const key = process.env.DecKey;

function decryptText(encryptedBase64, ivBase64) {
    const iv = Buffer.from(ivBase64, 'base64');
    const encryptedText = Buffer.from(encryptedBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'utf8'), iv);
    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}


async function decryptMiddleware(req, res, next) {
    try {
        const { iv, text } = req.body;
        // Decrypt text fields
        if (text) req.body.text = decryptText(text, iv);

        next();
    } catch (err) {
        console.error('Decryption error:', err);
        res.status(400).json({ error: 'Invalid encrypted data' });
    }
}

module.exports = decryptMiddleware;
