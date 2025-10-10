const express = require('express');
const router = express.Router();
const businessOwnerModel = require('../models/business_owner');
const bcrypt = require('bcrypt');
const uploadBufferToCloudinary = require('../Utilities/cloud/mediaToCloud');


router.post('/register', async (req, res) => {
    try {
        const { email, password, brandName, brandDescription, brandAvatarImage } = req.body;
        const doesExistViaEmail = await businessOwnerModel.ownerExistsViaEmail(email);

        if (doesExistViaEmail) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const doesExistViaBrandName = await businessOwnerModel.ownerExistsViaBrandName(brandName);
        if (doesExistViaBrandName) {
            return res.status(400).json({ error: 'Brand Name already exists' });
        }


        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await uploadBufferToCloudinary.uploadBufferToCloudinary(brandAvatarImage, "verbatica's_images", 'image');


        const businessOwner = await businessOwnerModel.register(email, hashedPassword, brandName, brandDescription, result.secure_url);
        const token = businessOwner.id;

        await businessOwnerModel.sendOtpAndSaveInDB(email);
        res.status(200).json({
            message: 'Brand registered successfully',
            token,
            businessOwner: businessOwner
        });

    } catch (e) {
        res.status(500).json({ message: 'error', error: "Something went wrong while signing up" });
        console.log(e);
    }

});

router.post('/verifyOTP', async (req, res) => {
    try {
        const { email, ownerId, otp } = req.body;
        const otpData = await businessOwnerModel.getOtp(email);
        if (otpData.otp != otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        const businessOwner = await businessOwnerModel.deleteAndGetVerifiedBusiness(ownerId, email);

        res.status(200).json({
            message: 'Brand verified successfully',
            businessOwner: businessOwner
        });



    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while verifying the OTP" });

    }
});

router.post('/resendOTP', async (req, res) => {
    try {
        const { email } = req.body;
        await businessOwnerModel.sendOtpAndSaveInDB(email);
        res.status(200);

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while sending the OTP" });

    }
});

router.post('/login', async (req, res) => {
    try {

        const { email, password } = req.body;
        const businessOwner = await businessOwnerModel.login(email);
        if (!businessOwner) {
            return res.status(400).json({ error: 'Incorrect Credentials' });
        }
        const isMatch = await bcrypt.compare(password, businessOwner.password);
        if (isMatch) {
            return res.status(200).json({ message: 'Login successful', businessOwner: businessOwner });
        } else {
            return res.status(400).json({ error: 'Invalid password' });
        }
    } catch (e) {
        res.status(500).json({ message: 'error', error: "Something went wrong while logging in" });
    }

});

router.put('/resetPassword/verifyOTP/newPassword', async (req, res) => {
    try {
        const { email, userId, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await businessOwnerModel.updatePasswordAndClearOTP(userId, email, hashedPassword);

        return res.status(200).json({ message: 'Password updated successfully', user: user });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while resetting the password" });

    }

});
router.post('/resetPassword/verifyOTP', async (req, res) => {
    try {
        const { email, token, otp } = req.body;
        const otpData = await businessOwnerModel.getOtp(email);

        if (otpData.otp != otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        return res.status(200).json({ message: 'successful', token });


    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while verifying the OTP" });

    }
});
router.post('/resetPassword', async (req, res) => {
    try {
        const { email } = req.body;
        const businessOwner = await businessOwnerModel.login(email);

        if (!businessOwner) {
            return res.status(400).json({ message: 'error', error: "Enter a correct email" });
        }

        await businessOwnerModel.sendOtpAndSaveInDB(email);
        const token = businessOwner.id;
        return res.status(200).json({ message: 'successfull', token });



    } catch (e) {
        res.status(500).json({ message: 'error', error: "Something went wrong" });

    }
});
router.put("/updateProfile", async (req, res) => {
    try {
        const { businessOwnerId, brandName, brandDescription, brandCoverImage, brandAvatarImage, oldCoverUrl, oldProfileUrl } = req.body;
        if (brandAvatarImage && brandCoverImage) {
            const result1 = await uploadBufferToCloudinary.uploadBufferToCloudinary(brandCoverImage, "verbatica's_images", 'image');
            const result2 = await uploadBufferToCloudinary.uploadBufferToCloudinary(brandAvatarImage, "verbatica's_images", 'image');
            const businessOwner = await businessOwnerModel.updateProfile(businessOwnerId, brandName, brandDescription, result1.secure_url, result2.secure_url);
            return res.status(200).json({ message: 'successfull', businessOwner: businessOwner });
        }
        else if (brandCoverImage) {
            const result = await uploadBufferToCloudinary.uploadBufferToCloudinary(brandCoverImage, "verbatica's_images", 'image');
            const businessOwner = await businessOwnerModel.updateProfile(businessOwnerId, brandName, brandDescription, result.secure_url, null);
            return res.status(200).json({ message: 'successfull', businessOwner: businessOwner });

        }
        else if (brandAvatarImage) {
            const result = await uploadBufferToCloudinary.uploadBufferToCloudinary(brandAvatarImage, "verbatica's_images", 'image');
            const businessOwner = await businessOwnerModel.updateProfile(businessOwnerId, brandName, brandDescription, null, result.secure_url);
            return res.status(200).json({ message: 'successfull', businessOwner: businessOwner });
        } else {
            const businessOwner = await businessOwnerModel.updateProfile(businessOwnerId, brandName, brandDescription, null, null);
            return res.status(200).json({ message: 'successfull', businessOwner: businessOwner });
        }


    } catch (e) {
        res.status(500).json({ message: 'error', error: "Something went wrong while updating the profile" });

    }
});


module.exports = router;
