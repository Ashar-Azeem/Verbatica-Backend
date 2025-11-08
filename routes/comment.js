const express = require('express');
const mongoose = require("mongoose");
const commentModel = require('../models/comment');
const userModel = require('../models/user');
const postModel = require('../models/post');
const decryptCommentMiddleware = require('../middleware/decryptComment');
const classifyTopLevelComment = require('../services/ClassificationServices/parentCommentClassification');
const classifyNestedComments = require("../services/ClassificationServices/nested_comment_classification");
const { compareSync } = require('bcrypt');
const router = express.Router();


router.post('/addComment', decryptCommentMiddleware, async (req, res) => {
    try {
        const {
            postId,
            titleOfThePost,
            text,
            author,
            profile,
            commenterGender,
            commenterCountry,
            parentId,
            clusters,
            uploadTime,
            userId,
            parentComment
        } = req.body;
        let savedComment;
        if (clusters && clusters.length != 0) {
            //Polarized nested comments:
            if (parentId) {
                //Making a heirarchy:
                const hierarchy = {
                    text: parentComment,
                    replies: [
                        {
                            text: text,
                            replies: []
                        }
                    ]
                };
                const classifications = await classifyNestedComments(clusters, ["Happy", "Sad", "Angry", "Neutral"], hierarchy);
                const comment = new commentModel({ postId, titleOfThePost, text, author, profile, commenterGender, commenterCountry, uploadTime, cluster: classifications.Cluster, emotionalTone: classifications.Tone, userId, parentId });
                savedComment = await comment.save();
            } else {
                //Top level comment:
                const classifications = await classifyTopLevelComment(text, clusters);
                const comment = new commentModel({ postId, titleOfThePost, text, author, profile, commenterGender, commenterCountry, uploadTime, cluster: classifications.predicted_cluster, emotionalTone: classifications.tone, userId, parentId });
                savedComment = await comment.save();
            }
        } else {
            //Non polarized comments:
            const comment = new commentModel({ postId, titleOfThePost, text, author, profile, commenterGender, commenterCountry, uploadTime, userId, parentId });
            savedComment = await comment.save();
        }

        if (parentId) {
            await commentModel.findByIdAndUpdate(
                parentId,
                { $push: { allReplies: savedComment._id } },
            )
        }
        const formattedComment = new Comment({
            id: savedComment._id,
            postId: savedComment.postId,
            titleOfThePost: savedComment.titleOfThePost,
            text: savedComment.text,
            author: savedComment.author,
            profile: savedComment.profile,
            commenterGender: savedComment.commenterGender,
            commenterCountry: savedComment.commenterCountry,
            parentId: savedComment.parentId,
            allReplies: Array.isArray(savedComment.allReplies) ? savedComment.allReplies : [],
            uploadTime: savedComment.uploadTime,
            totalUpvotes: savedComment.totalUpvotes,
            totalDownvotes: savedComment.totalDownvotes,
            cluster: savedComment.cluster,
            isUpvote: savedComment.isUpvote,
            isDownvote: savedComment.isDownvote,
            emotionalTone: savedComment.emotionalTone,
            userId: userId
        });
        await postModel.updateCommentCountInPost(postId)
        res.status(200).json({ message: 'success', comment: formattedComment });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while adding a comment" });
    }
});

router.get('/getComments', async (req, res) => {
    try {
        const { visitingUserId, ownerUserId } = req.body;
        const comments = await commentModel.find({ userId: ownerUserId }).sort({ uploadTime: -1 });
        const formattedComment = comments.map((comment => new Comment({
            id: comment._id,
            postId: comment.postId,
            titleOfThePost: comment.titleOfThePost,
            text: comment.text,
            author: comment.author,
            profile: comment.profile,
            commenterGender: comment.commenterGender,
            commenterCountry: comment.commenterCountry,
            parentId: comment.parentId,
            allReplies: [],
            uploadTime: comment.uploadTime,
            totalUpvotes: comment.totalUpvotes,
            totalDownvotes: comment.totalDownvotes,
            cluster: comment.cluster,
            isUpvote: comment.isUpvote,
            isDownvote: comment.isDownvote,
            emotionalTone: comment.emotionalTone,
            userId: visitingUserId
        })));

        res.status(200).json({ message: 'success', comments: formattedComment });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching user comments" });
    }
});

router.get('/getCommentsOfPost', async (req, res) => {
    try {
        const { userId, postId, before } = req.body;
        const beforeDate = before ? new Date(before) : null;
        const query = { postId, parentId: null };
        if (beforeDate) {
            query.createdAt = { $lt: beforeDate };
        }

        const comments = await commentModel
            .find(query)
            .populate({
                path: "allReplies",
                populate: {
                    path: "allReplies",
                    populate: {
                        path: "allReplies",
                        populate: {
                            path: "allReplies",
                            populate: {
                                path: "allReplies",
                            },
                        },
                    },
                },
            })
            .sort({ createdAt: -1 }).limit(10)
            .exec();
        const formattedComment = comments.map((comment => new Comment({
            id: comment._id,
            postId: comment.postId,
            titleOfThePost: comment.titleOfThePost,
            text: comment.text,
            author: comment.author,
            profile: comment.profile,
            commenterGender: comment.commenterGender,
            commenterCountry: comment.commenterCountry,
            parentId: comment.parentId,
            allReplies: Array.isArray(comment.allReplies) ? comment.allReplies : [],
            uploadTime: comment.uploadTime,
            totalUpvotes: comment.totalUpvotes,
            totalDownvotes: comment.totalDownvotes,
            cluster: comment.cluster,
            isUpvote: comment.isUpvote,
            isDownvote: comment.isDownvote,
            emotionalTone: comment.emotionalTone,
            userId: userId
        })));

        res.status(200).json({ message: 'success', comments: formattedComment });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching comments" });
    }
});


router.get('/getClusterComments', async (req, res) => {
    try {
        const { postId, clusterName, userId } = req.body;

        const comments = await commentModel
            .find({ postId: postId, cluster: clusterName }).sort({ createdAt: -1 }).lean();

        for (let i = 0; i < comments.length; i++) {
            comments[i].allReplies = [];
            if (comments[i].parentId != null) {
                let cloneComment = JSON.parse(JSON.stringify(comments[i]));

                let chain = {
                    ...cloneComment,
                };
                while (cloneComment.parentId) {
                    const parent = await commentModel.findById(cloneComment.parentId).lean();
                    if (!parent) break;


                    parent.allReplies = [chain];

                    chain = parent;
                    cloneComment = parent;
                }
                comments[i] = chain;
            }
        }

        const formattedComment = comments.map((comment => new Comment({
            id: comment._id,
            postId: comment.postId,
            titleOfThePost: comment.titleOfThePost,
            text: comment.text,
            author: comment.author,
            profile: comment.profile,
            commenterGender: comment.commenterGender,
            commenterCountry: comment.commenterCountry,
            parentId: comment.parentId,
            allReplies: Array.isArray(comment.allReplies) ? comment.allReplies : [],
            uploadTime: comment.uploadTime,
            totalUpvotes: comment.totalUpvotes,
            totalDownvotes: comment.totalDownvotes,
            cluster: comment.cluster,
            isUpvote: comment.isUpvote,
            isDownvote: comment.isDownvote,
            emotionalTone: comment.emotionalTone,
            userId: userId
        })));

        res.status(200).json({ message: 'success', comments: formattedComment });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching cluster comments" });
    }
});

router.put("/updateVote", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { commentId, userId, type } = req.body;

        if (!commentId || !userId || !["upvote", "downvote"].includes(type)) {
            return res.status(400).json({ message: "Invalid input data." });
        }

        const comment = await commentModel.findById(commentId).session(session);
        if (!comment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Comment not found." });
        }

        const upvotes = Object.fromEntries((comment.isUpvote || new Map()).entries());
        const downvotes = Object.fromEntries((comment.isDownvote || new Map()).entries());

        const hasUpvoted = upvotes[userId] === true;
        const hasDownvoted = downvotes[userId] === true;
        let auraChange = 0;

        if (type === "upvote") {
            if (hasUpvoted) {
                delete upvotes[userId];
                comment.totalUpvotes -= 1;
                auraChange -= 1;
            } else {
                upvotes[userId] = true;
                comment.totalUpvotes += 1;
                auraChange += 1;
                if (hasDownvoted) {
                    delete downvotes[userId];
                    comment.totalDownvotes -= 1;
                    auraChange += 1;
                }
            }
        } else if (type === "downvote") {
            if (hasDownvoted) {
                delete downvotes[userId];
                comment.totalDownvotes -= 1;
                auraChange += 1;
            } else {
                downvotes[userId] = true;
                comment.totalDownvotes += 1;
                auraChange -= 1;
                if (hasUpvoted) {
                    delete upvotes[userId];
                    comment.totalUpvotes -= 1;
                    auraChange -= 1;
                }
            }
        }
        comment.isUpvote = new Map(Object.entries(upvotes));
        comment.isDownvote = new Map(Object.entries(downvotes));

        await comment.save({ session });
        await userModel.updateAura(comment.userId, auraChange);
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: "Vote updated successfully.",
            totalUpvotes: comment.totalUpvotes,
            totalDownvotes: comment.totalDownvotes,

        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error updating vote:", err);
        return res.status(500).json({
            message: "Internal server error.",
            error: err.message,
        });
    }
});


module.exports = router;




//Utility class:
class Comment {
    constructor({
        id,
        postId,
        titleOfThePost,
        text,
        author,
        profile,
        commenterGender,
        commenterCountry,
        parentId,
        allReplies,
        uploadTime,
        totalUpvotes,
        totalDownvotes,
        cluster,
        isUpvote,
        isDownvote,
        emotionalTone,
        userId,
    }) {
        this.id = id;
        this.postId = postId;
        this.titleOfThePost = titleOfThePost;
        this.text = text;
        this.author = author;
        this.profile = profile;
        this.commenterGender = commenterGender;
        this.commenterCountry = commenterCountry;
        this.parentId = parentId;
        this.emotionalTone = emotionalTone;
        this.allReplies = Array.isArray(allReplies)
            ? allReplies.map(
                (reply) =>
                    new Comment({
                        id: reply._id,
                        postId: reply.postId,
                        titleOfThePost: reply.titleOfThePost,
                        text: reply.text,
                        author: reply.author,
                        profile: reply.profile,
                        commenterGender: reply.commenterGender,
                        commenterCountry: reply.commenterCountry,
                        parentId: reply.parentId,
                        allReplies: Array.isArray(reply.allReplies) ? reply.allReplies : [],
                        uploadTime: reply.uploadTime,
                        totalUpvotes: reply.totalUpvotes,
                        totalDownvotes: reply.totalDownvotes,
                        cluster: reply.cluster,
                        isUpvote: reply.isUpvote,
                        isDownvote: reply.isDownvote,
                        emotionalTone: reply.emotionalTone,
                        userId,
                    })
            )
            : [];

        this.uploadTime = new Date(uploadTime);
        this.totalUpvotes = totalUpvotes;
        this.totalDownvotes = totalDownvotes;
        this.cluster = cluster;


        const upvotes = isUpvote instanceof Map ? Object.fromEntries(isUpvote.entries()) : isUpvote || {};
        const downvotes = isDownvote instanceof Map ? Object.fromEntries(isDownvote.entries()) : isDownvote || {};

        this.isUpVote = userId && upvotes[userId] ? upvotes[userId] : false;
        this.isDownVote = userId && downvotes[userId] ? downvotes[userId] : false;
    }

    toJSON() {
        return {
            id: this.id.toString(),
            postId: this.postId,
            titleOfThePost: this.titleOfThePost,
            text: this.text,
            author: this.author,
            profile: this.profile,
            commenterGender: this.commenterGender,
            commenterCountry: this.commenterCountry,
            parentId: this.parentId,
            uploadTime: this.uploadTime.toISOString(),
            totalUpvotes: this.totalUpvotes,
            totalDownvotes: this.totalDownvotes,
            cluster: this.cluster,
            isUpVote: this.isUpVote,
            isDownVote: this.isDownVote,
            emotionalTone: this.emotionalTone,
            allReplies: this.allReplies.map((r) => r.toJSON()),
        };
    }
}
