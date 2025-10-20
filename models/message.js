const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {

        messageId: {
            type: String,
            required: true,
            unique: true,
        },

        message: {
            type: String,
            required: true,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },

        sentBy: {
            type: String, // userId as string
            required: true,
        },

        replyMessage: {
            type: String,
            ref: 'Message'
        },

        reaction: {
            emoji: { type: String, default: null },
            reactedUser: { type: String, default: null }, // string userId
        },

        chatId: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const messageModel = mongoose.model("Message", messageSchema);
module.exports = messageModel;