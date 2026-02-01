const express = require('express');
const router = express.Router();
const messageModel = require('../models/message');
const chatModel = require('../models/chat');

router.get('/getMessages', async (req, res) => {
    try {
        const { chatId, before } = req.body;

        const beforeDate = before ? new Date(before) : null;


        const query = { chatId };

        if (beforeDate) {
            query.createdAt = { $lt: beforeDate };
        }

        const messages = await messageModel.find(query)
            .populate({
                path: 'replyMessage',
                model: 'Message',
                localField: 'replyMessage',
                foreignField: 'messageId',
                justOne: true,
            })
            .sort({ createdAt: -1 })
            .limit(15);

        const formatted = messages.map(formatMessage).reverse();


        return res.status(200).json({ message: 'successfull', messages: formatted });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the messages" });
    }
});
router.post('/sendMessage', async (req, res) => {
    try {
        const notificationModel = require('../models/notification');
        const io = req.app.get("io");
        const onlineUsers = req.app.get("onlineUsers");

        const { messageId, chatId, message, sentBy, replyingMessageId, reaction, receiverId, createdAt } = req.body;

        const newMessage = await messageModel
            .create({
                messageId,
                message,
                sentBy,
                chatId,
                replyMessage: replyingMessageId || null,
                reaction: reaction || { emoji: null, reactedUser: null },
                createdAt: createdAt
            });

        const populatedMessage = await newMessage.populate({
            path: 'replyMessage',
            model: 'Message',
            localField: 'replyMessage',
            foreignField: 'messageId',
            justOne: true,
        });

        //Update the seen status of two users in the chat
        const updatedChat = await chatModel.findOneAndUpdate(
            { chatId: chatId }, // Your filter
            {
                $set: {
                    [`lastMessageSeenBy.${receiverId}`]: false,
                    [`lastMessageSeenBy.${sentBy}`]: true,
                    lastMessage: message,
                    lastUpdated: new Date()
                },
            },
            {
                new: true,
                runValidators: true
            }
        );


        const formattedMessage = formatMessage(populatedMessage);
        io.to(sentBy).emit("new_message", formattedMessage);
        io.to(receiverId).emit("new_message", formattedMessage);
        if (!onlineUsers.has(receiverId)) {
            notificationModel.sendMessagesNotification(receiverId, updatedChat.publicKeys.get(sentBy.toString()), updatedChat.userNames.get(sentBy.toString()), message);
        }
        return res.status(200).json({ message: 'successfull' });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while sending the messages" });
    }
});

router.put('/updateMessage', async (req, res) => {
    try {
        const io = req.app.get("io");
        const { messageId, reaction, notifyUserId } = req.body;
        const updatedMessage = await messageModel.findOneAndUpdate(
            { messageId },
            { $set: { reaction } },
            { new: true }
        );
        const formattedMessage = formatMessage(updatedMessage);
        io.to(notifyUserId).emit("update_message", formattedMessage);
        console.log(notifyUserId);
        return res.status(200).json({ message: 'successfull' });


    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while updating a message" });

    }
});

router.put('/updateSeenStatus', async (req, res) => {
    try {
        const io = req.app.get("io");

        const { chatId, userId, receiverId } = req.body;

        await chatModel.updateOne(
            { chatId: chatId },
            {
                $set: {
                    [`lastMessageSeenBy.${userId}`]: true,
                },
            }
        );
        io.to(receiverId).emit("seen_ack", { chatId: chatId });



        return res.status(200).json({ message: 'successfull' });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong" });
    }
});

module.exports = router;


function formatMessage(msg) {
    return {
        chatId: msg.chatId,
        id: msg.messageId,
        message: msg.message,
        createdAt: msg.createdAt,
        sentBy: msg.sentBy,
        reply_message: msg.replyMessage
            ? {
                id: msg.replyMessage.messageId,
                message: msg.replyMessage.message || "",
                replyBy: msg.sentBy || "",
                replyTo: msg.replyMessage.sentBy || "",
            }
            : {
                id: '',
                message: "",
                replyBy: "",
                replyTo: "",
            },
        reaction: msg.reaction
            ? {
                reactions: msg.reaction.emoji ? [msg.reaction.emoji] : [],
                reactedUserIds: msg.reaction.reactedUser
                    ? [msg.reaction.reactedUser]
                    : [],
            }
            : { reactions: [], reactedUserIds: [] },
    };
}



