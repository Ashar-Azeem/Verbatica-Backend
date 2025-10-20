const express = require('express');
const bcrypt = require('bcrypt');
const userModel = require('../models/user');
const { generateUniqueGoofyName } = require('../Utilities/auth/UniqueNameGenerator');
const { verifyGoogleToken } = require('../Utilities/auth/SignInWithGoogle');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { email, password, gender, country } = req.body;

        const doesExist = await userModel.userExists(email);

        if (doesExist) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const userName = generateUniqueGoofyName();
        const user = await userModel.register(email, hashedPassword, userName, country, gender);

        const token = user.id;

        await userModel.sendOtpAndSaveInDB(email);
        res.status(200).json({
            message: 'User registered successfully',
            token,
            user: user
        });

    } catch (e) {
        res.status(500).json({ message: 'error', error: "Something went wrong while signing up" });
    }

});

router.post('/verifyOTP', async (req, res) => {
    try {
        const { email, userId, otp, privateKey, publicKey } = req.body;
        const otpData = await userModel.getOtp(email);
        if (otpData.otp != otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        const user = await userModel.deleteAndGetVerifiedUser(userId, email, privateKey, publicKey);

        res.status(200).json({
            message: 'User verified successfully',
            user: user
        });



    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while verifying the OTP" });

    }
});

router.post('/resendOTP', async (req, res) => {
    try {
        const { email } = req.body;
        await userModel.sendOtpAndSaveInDB(email);
        res.status(200);

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while sending the OTP" });

    }
});

router.post('/login', async (req, res) => {
    try {

        const { email, password } = req.body;
        const user = await userModel.login(email);
        if (!user) {
            return res.status(400).json({ error: 'Incorrect Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const result = await userModel.getPrivateKey(user.id);
            return res.status(200).json({ message: 'Login successful', user: user, privateKey: result.private_key });

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

        const user = await userModel.updatePasswordAndClearOTP(userId, email, hashedPassword);

        return res.status(200).json({ message: 'Password updated successfully', user: user });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while resetting the password" });

    }

});
router.post('/resetPassword/verifyOTP', async (req, res) => {
    try {
        const { email, token, otp } = req.body;
        const otpData = await userModel.getOtp(email);

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
        const user = await userModel.login(email);

        if (!user) {
            return res.status(400).json({ message: 'error', error: "Enter a correct email or try logging in through google" });

        }

        await userModel.sendOtpAndSaveInDB(email);
        const token = user.id;
        return res.status(200).json({ message: 'successfull', token });



    } catch (e) {
        res.status(500).json({ message: 'error', error: "Something went wrong" });

    }
});

router.post('/continueWithGoogle', async (req, res) => {
    try {
        const { token } = req.body;
        const email = await verifyGoogleToken(token);

        //Meaning that if user already exists and isVerified then even if they registered old school way the account will be merged.
        let user = await userModel.ContinueWithGoogle(email);


        if (user) {
            const key = await userModel.getPrivateKey(user.id);
            return res.status(200).json({ message: 'Complete', user: user, privateKey: key.private_key });
        }

        const userName = generateUniqueGoofyName();
        const date = new Date().toISOString().split('T')[0]
        user = {
            "id": 69, "email": email, "userName": userName, "country": "notSure", "gender": "NotSure", "isVerified": true, "about": "hehehehe", "avatarId": 1, "joinDate": date, "aura": 0, "isGoogleSignIn": true, "public_key": ""
        }


        return res.status(200).json({ message: 'Partial', user: user, privateKey: null });

    } catch (e) {
        res.status(500).json({ message: 'error', error: 'Something went wrong while signing in through google' });
        console.log(e.message);
    }

})

router.post('/continueWithGoogle/CompletedInfo', async (req, res) => {
    try {
        const { user, publicKey, privateKey } = req.body;

        const newUser = await userModel.CompleteSignUpWithGoogle(user, publicKey, privateKey);

        return res.status(200).json({ message: 'Successful', user: newUser, privateKey: privateKey });



    } catch (e) {
        res.status(500).json({ message: 'error', error: 'Something went wrong while signing in through google' });
    }

})



module.exports = router;
