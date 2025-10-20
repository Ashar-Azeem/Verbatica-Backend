const express = require('express');
const userModel = require('../models/user');
const relationshipModel = require('../models/relationship');
const chatModel = require('../models/chat');

const router = express.Router();



router.put('/updateAvatarId', async (req, res) => {
    try {
        const { userId, avatarId } = req.body;
        const user = await userModel.updateAvatarId(userId, avatarId);

        if (!user) {
            return res.status(400).json({ error: 'Failed to update the avatar' });
        }
        await chatModel.updateMany(
            { participantIds: userId },
            { $set: { [`userProfiles.${userId}`]: avatarId } }
        );

        return res.status(200).json({ message: 'successfull', user: user });


    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while updating the avatar" });

    }
});



router.put('/updateAboutSection', async (req, res) => {
    try {
        const { userId, about } = req.body;

        const user = await userModel.updateAboutSection(userId, about);

        if (!user) {
            return res.status(400).json({ error: 'Failed to update the about' });
        }

        return res.status(200).json({ message: 'successfull', user: user });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while updating the about section" });
    }
});

router.post('/following', async (req, res) => {
    try {
        const { followerId, followingId } = req.body;

        const isSuccessful = await relationshipModel.followingAUser(followerId, followingId);

        if (!isSuccessful) {
            return res.status(400).json({ error: 'Failed to follow a user' });
        }

        return res.status(200).json({ message: 'successfull' });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while following a user" });

    }
});

router.delete('/unfollowing', async (req, res) => {
    try {
        const { followerId, followingId } = req.body;

        const isSuccessful = await relationshipModel.unFollowingAUser(followerId, followingId);

        if (!isSuccessful) {
            return res.status(400).json({ error: 'Failed to unfollow a user' });
        }

        return res.status(200).json({ message: 'successfull' });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while unfollowing a user" });

    }
});


router.get('/VisitingUser', async (req, res) => {
    try {
        const { myUserId, otherUserId } = req.body;

        const user = await userModel.getUserViaId(otherUserId);
        const isFollowing = await relationshipModel.checkFollowExists(myUserId, otherUserId);


        return res.status(200).json({ message: 'successfull', user: user, isFollowing: isFollowing });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the profile" });

    }
});

router.get('/FetchUpdatedAura', async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await userModel.getUserViaId(userId);


        return res.status(200).json({ message: 'successfull', aura: user.aura });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the aura" });

    }
});

router.delete('/deleteHistory', async (req, res) => {
    try {
        const { userId } = req.body;
        const isValid = await userModel.deletePrefrence(userId);
        return res.status(200).json({ message: 'successfull', isValid: isValid });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while removing the prefrence" });

    }
});





module.exports = router;
