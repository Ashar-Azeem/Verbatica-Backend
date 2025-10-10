const { webcrypto } = require('crypto');
const { subtle } = webcrypto;
const crypto = require('crypto');

const key = process.env.DecKey; // 32 chars (store securely, not in code)

function decryptText(encryptedBase64, ivBase64) {
    const iv = Buffer.from(ivBase64, 'base64');
    const encryptedText = Buffer.from(encryptedBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'utf8'), iv);
    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}


//making this function non blocking because it is used to decrypt a media which is a heavy task 
async function decryptBuffer(encryptedBase64, ivBase64) {
    // Convert inputs from base64 to Uint8Array
    const iv = Uint8Array.from(Buffer.from(ivBase64, 'base64'));
    const encryptedBuffer = Uint8Array.from(Buffer.from(encryptedBase64, 'base64'));

    // Import AES key (make sure `key` is a raw 32-byte key for AES-256)
    const cryptoKey = await subtle.importKey(
        'raw',                                // raw format
        Buffer.from(key, 'utf8'),             // key material
        { name: 'AES-CBC' },                  // algorithm
        false,                                // extractable
        ['decrypt']                           // usages
    );

    // Perform decryption (non-blocking)
    const decryptedArrayBuffer = await subtle.decrypt(
        {
            name: 'AES-CBC',
            iv: iv
        },
        cryptoKey,
        encryptedBuffer
    );

    // Convert ArrayBuffer back to Buffer for Node.js usage
    return Buffer.from(decryptedArrayBuffer);
}


async function decryptMiddleware(req, res, next) {
    try {
        const { iv, title, description, image, video } = req.body;
        // Decrypt text fields
        if (title) req.body.title = decryptText(title, iv);
        if (description) req.body.description = decryptText(description, iv);

        // Decrypt media if present
        if (image) {
            // media will be a base64 string, decrypted result will be a Buffer
            req.body.image = await decryptBuffer(image, iv);
        }
        if (video) {
            // media will be a base64 string, decrypted result will be a Buffer
            req.body.video = await decryptBuffer(video, iv);
        }

        next();
    } catch (err) {
        console.error('Decryption error:', err);
        res.status(400).json({ error: 'Invalid encrypted data' });
    }
}

module.exports = decryptMiddleware;
