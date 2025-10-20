const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
    {
        chatId: {
            type: String,
            required: true,
            unique: true,
        },

        participantIds: {
            type: [Number],
            required: true,
        },

        publicKeys: {
            type: Map,
            of: String,
            default: {},
        },

        userProfiles: {
            type: Map,
            of: Number,
            default: {},
        },

        userNames: {
            type: Map,
            of: String,
            default: {},
        },

        lastMessageSeenBy: {
            type: Map,
            of: Boolean,
            default: {},
        },

        lastMessage: {
            type: String,
            default: "",
        },

        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const chatModel = mongoose.model("Chat", chatSchema);
module.exports = chatModel;
