import mongoose from "mongoose";

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

        secretKeys: {
            type: Map,
            of: String,
            default: {},
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

export default mongoose.model("Chat", chatSchema);
