const express = require('express');
const router = express.Router();
const uploadBufferToCloudinary = require('../Utilities/cloud/mediaToCloud');
const adsModel = require('../models/ad');
const insertIntoElasticSearch = require('../services/Elastic_Search/insert');
const Stripe = require("stripe");


router.post("/create-payment-intent", async (req, res) => {
    try {
        const { amount } = req.body;
        const stripe = new Stripe(process.env.STRIPETESTINGKEY);
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency: "usd",
                automatic_payment_methods: { enabled: true },
            });
            res.json({ clientSecret: paymentIntent.client_secret });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while payment" });

    }
});

router.post("/postAdAfterConfirmation", async (req, res) => {
    try {
        const { title, description, countries, genders, plan, image, video, redirectLink, ownerId, brandName, brandAvatarLink } = req.body;
        let ad;
        //image ad
        if (image) {
            const result = await uploadBufferToCloudinary.uploadBufferToCloudinary(image, "verbatica's_images", 'image');
            ad = await adsModel.insertAd(title, description, countries, genders, plan, result.secure_url, null, redirectLink, ownerId);
        }
        //video ad  
        else if (video) {
            const videoResult = await uploadBufferToCloudinary.uploadBufferToCloudinary(video, "verbatica's_videos", 'video');
            ad = await adsModel.insertAd(title, description, countries, genders, plan, null, videoResult.secure_url, redirectLink, ownerId);
        }

        //Uploading the same ad to the elastic search database for AD recommendation:
        await insertIntoElasticSearch.indexAd({ id: ad.ad_id, title: ad.title, description: ad.description });

        res.status(200).json({
            message: 'successful',
            ad: {
                id: ad.ad_id,
                title: ad.title,
                brandName: brandName,
                brandProfileLink: brandAvatarLink,
                description: ad.description,
                countries: ad.countries,
                genders: ad.genders,
                imageLink: ad.image_url,
                videoLink: ad.video_url,
                redirectLink: ad.redirect_link,
                plan: ad.plan,
                totalImpressions: ad.total_impressions,
                totalClicks: ad.total_clicks,
                uploadTime: ad.upload_date.toISOString(),
                ownerId: ad.owner_id
            }
        });
    } catch (e) {
        res.status(500).json({ message: 'error', error: "Something went wrong while uploading the ad" });
        console.log(e);
    }
});
router.get("/getAds", async (req, res) => {
    try {

        const { brandOwnerId } = req.query;
        const ads = await adsModel.getAdsById(brandOwnerId);
        res.status(200).json({ message: "successful", ads: ads });

    } catch (e) {
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching ads" });
        console.log(e);
    }
});

router.delete("/deleteAd", async (req, res) => {
    try {
        const { adId } = req.body;
        const result = await adsModel.deleteAdById(adId);
        if (result.ad) {
            if (result.ad.image_url) {
                uploadBufferToCloudinary.deleteMediaByUrl(result.ad.image_url, 'image');
            } else {
                uploadBufferToCloudinary.deleteMediaByUrl(result.ad.video_url, 'video');
            }
        }
        res.status(200).json({ message: "successful", isDeleted: result.isDeleted });

    } catch (e) {
        res.status(500).json({ message: 'error', error: "Something went wrong while deleting the ad" });
        console.log(e);
    }
});





module.exports = router;


