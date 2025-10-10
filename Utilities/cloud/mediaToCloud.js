const cloudinary = require('cloudinary').v2;

const streamifier = require('streamifier');

async function uploadBufferToCloudinary(buffer, folder, type = 'image') {
    return new Promise((resolve, reject) => {
        let resourceType;
        if (type === 'image') {
            resourceType = 'image';
        } else if (type === 'video') {
            resourceType = 'video';
        } else {
            return reject(new Error(`Unsupported type: ${type}`));
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: resourceType,
                timeout: 360000,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}
async function deleteMediaByUrl(fileUrl, resourceType) {
    try {
        // Decode any URL-encoded characters
        const decodedUrl = decodeURIComponent(fileUrl);

        // Extract the public ID (everything after 'upload/' and before file extension)
        const regex = /\/upload\/(?:v\d+\/)?([^\.]+)/;
        const match = decodedUrl.match(regex);
        if (!match) {
            throw new Error('Invalid Cloudinary URL format.');
        }

        const publicId = match[1]; // e.g. verbatica's_images/aybbubi7gqbfofkupkdh


        // Delete the media (set resource_type manually if it's a video)
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

        return result;
    } catch (error) {
        console.error('Error deleting media:', error);
        throw error;
    }
}

module.exports = { uploadBufferToCloudinary, deleteMediaByUrl };
