const express = require('express');
const postModel = require('../models/post');
const adModel = require('../models/ad');
const decryptPostMiddleware = require('../middleware/decryptPost');
const uploadBufferToCloudinary = require('../Utilities/cloud/mediaToCloud');
const insertIntoElasticSearch = require('../services/Elastic_Search/insert');


const router = express.Router();


router.post('/uploadPost', decryptPostMiddleware, async (req, res) => {
    try {

        const { title, description, image, video, isDebate, userId, clusters, userName, avatarId, newsId } = req.body;
        let post;

        //image post
        if (image) {
            const result = await uploadBufferToCloudinary.uploadBufferToCloudinary(image, "verbatica's_images", 'image');
            post = await postModel.uploadAPost(title, description, result.secure_url, null, isDebate, userId, clusters, newsId);
        }
        //video post
        else if (video) {
            const videoResult = await uploadBufferToCloudinary.uploadBufferToCloudinary(video, "verbatica's_videos", 'video');
            post = await postModel.uploadAPost(title, description, null, videoResult.secure_url, isDebate, userId, clusters, newsId);

        }
        //text post
        else {
            post = await postModel.uploadAPost(title, description, null, null, isDebate, userId, clusters, newsId);
        }

        //Uploading the same post to the elastic search database for FOR YOU POSTS:
        await insertIntoElasticSearch.indexPost({ id: post.post_id, title: post.title, description: post.description, upload_at: post.upload_date });
        await postModel.registerView(userId, post.post_id);

        res.status(200).json({
            message: 'successful',
            post: {
                id: post.post_id.toString(),
                name: userName,
                userId: post.user_id,
                avatar: avatarId,
                title: post.title,
                description: post.description,
                postImageLink: post.image_link,
                postVideoLink: post.video_link,
                isDebate: post.is_debate,
                upVote: post.total_upvotes,
                downVotes: post.total_downvotes,
                clusters: post.clusters,
                isUpVote: false,
                isDownVote: false,
                comments: post.total_comments,
                uploadTime: post.upload_date.toISOString()
            }
        });


    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while uploading the post" });
    }
});
router.get('/getPosts', async (req, res) => {
    try {
        const { ownerUserId, visitingUserId, cursor } = req.body;
        const posts = await postModel.getPosts(ownerUserId, visitingUserId, cursor);
        return res.status(200).json({ message: 'successfull', posts: posts });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the post" });
    }
});

router.put('/updateVotes', async (req, res) => {
    try {
        const { postId, userId, value } = req.body;
        await postModel.voteOnPost(postId, userId, value);
        return res.status(200).json({ message: 'successfull' });


    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while voting a post" });
    }
});

router.get('/getPostsWithInNews', async (req, res) => {
    try {
        const { newsId, ownerId } = req.body;

        const posts = await postModel.getPostsWithInNews(newsId, ownerId);

        return res.status(200).json({ message: 'successfull', posts: posts });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the posts" });
    }
});

router.get("/followingPosts", async (req, res) => {
    try {
        const { userId, cursor, vector, page } = req.body;
        const posts = await postModel.getFollowingPosts(userId, cursor);
        const result = await adModel.getAd(userId, page, vector);
        return res.status(200).json({ message: 'successfull', posts: posts, ad: result.ad, vector: result.vector });


    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the following posts" });
    }
});
router.get("/forYou", async (req, res) => {
    try {
        const { userId, lastPost, page, vector } = req.body;
        if (!vector) {
            //fetch the history posts
            const history = await postModel.getHistoryPosts(userId);
            if (history.length == 0) {
                //fetch the trending posts for the first page 
                const posts = await postModel.getTrendingPosts(page, userId);
                return res.status(200).json({ message: 'successfull', posts: posts, vector: null, lastPost: null });
            } else {
                //initial fetch so we have to make vector first
                const result = await postModel.getForYouPosts(userId, history, lastPost, page, vector);
                //Get one ad with each post:
                const adResult = await adModel.getAd(userId, page, result.vector);

                return res.status(200).json({ message: 'successfull', posts: result.posts, vector: result.vector, lastPost: result.lastPost, ad: adResult.ad });
            }
        } else {
            //page greater then 1 so vector is already made
            const result = await postModel.getForYouPosts(userId, [], lastPost, page, vector);
            //Get one ad:
            const adResult = await adModel.getAd(userId, page, vector);

            return res.status(200).json({ message: 'successfull', posts: result.posts, vector: result.vector, lastPost: result.lastPost, ad: adResult.ad });
        }

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the for you posts" });

    }
});

router.get("/trendingPost", async (req, res) => {
    try {
        const { userId, page, vector } = req.body;
        const posts = await postModel.getTrendingPosts(page, userId);
        //Get one ad:
        const result = await adModel.getAd(userId, page, vector);

        return res.status(200).json({ message: 'successfull', posts: posts, ad: result.ad, vector: result.vector });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the for you posts" });

    }
});

router.post("/registerClick", async (req, res) => {
    try {
        const { userId, postId } = req.body;
        await postModel.registerView(userId, postId);
        return res.status(200).json({ message: 'successfull' });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong" });

    }
});

router.get("/searchSimilarPosts", async (req, res) => {
    try {
        const { userId, title, description } = req.body;
        const posts = await postModel.getSimilarPosts(userId, title, description);
        return res.status(200).json({ message: 'successfull', posts: posts });


    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong" });
    }
});






module.exports = router;