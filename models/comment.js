const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
    {
        postId: {
            type: Number,
            required: true,
        },
        userId: {
            type: Number,
            required: true,
        },
        titleOfThePost: {
            type: String,
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
        author: {
            type: String,
            required: true,
        },
        profile: {
            type: String,
            required: true,
        },
        commenterGender: {
            type: String,
            enum: ["Male", "Female"],
            required: true,
        },
        commenterCountry: {
            type: String,
            required: true,
        },

        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },

        allReplies: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Comment",
            },
        ],

        uploadTime: {
            type: Date,
            default: Date.now,
        },

        isUpvote: {
            type: Map,
            of: Boolean,
            default: {},
        },
        isDownvote: {
            type: Map,
            of: Boolean,
            default: {},
        },

        totalUpvotes: {
            type: Number,
            default: 0,
        },
        totalDownvotes: {
            type: Number,
            default: 0,
        },

        cluster: {
            type: String,
            default: null,
        },
        emotionalTone: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

const commentModel = mongoose.model("Comment", commentSchema);
module.exports = commentModel;
