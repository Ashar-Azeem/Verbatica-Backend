const express = require('express');
const router = express.Router();
const chatModel = require('../models/chat');
const messageModel = require('../models/message');
const { v4: uuidv4 } = require('uuid');


router.get('/getChatWithAUser', async (req, res) => {
    try {
        const { user1Id, user2Id } = req.body;
        const chat = await chatModel.findOne({
            participantIds: { $all: [user1Id, user2Id] }
        });

        return res.status(200).json({ message: 'successfull', chat: chat });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the chat" });
    }
});
router.get('/getChat', async (req, res) => {
    try {
        const { chatId } = req.body;
        const chat = await chatModel.findOne({
            chatId
        });

        return res.status(200).json({ message: 'successfull', chat: chat });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the chat" });
    }
});
router.get('/getUserChats', async (req, res) => {
    try {
        const { userId } = req.body;
        const chats = await chatModel.find({
            participantIds: { $in: [userId] }
        });

        return res.status(200).json({ message: 'successfull', chats: chats });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the user chats" });
    }
});

router.post('/insertChat', async (req, res) => {
    try {
        const { participantIds, publicKeys, userProfiles, userNames, lastMessageSeenBy } = req.body;
        const uniqueId = uuidv4();

        const newChat = await chatModel.create({
            chatId: uniqueId,
            participantIds: participantIds,
            userProfiles: userProfiles,
            lastMessageSeenBy: lastMessageSeenBy,
            userNames: userNames,
            publicKeys: publicKeys,
            lastMessage: "",
            lastUpdated: Date.now(),
        });

        return res.status(200).json({ message: 'successfull', chat: newChat });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while creating a chat" });
    }
});
router.delete('/deleteChat', async (req, res) => {
    try {
        const { chatId } = req.body;

        await messageModel.deleteMany({ chatId });

        await chatModel.deleteOne({ chatId });

        console.log("chat deleted");


        return res.status(200).json({ message: 'successfull' });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while creating a chat" });
    }
});






module.exports = router;
