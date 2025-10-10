const express = require('express');
const newsModel = require('../models/news');


const router = express.Router();


router.get('/getNews', async (req, res) => {
    try {

        const { country, date } = req.body;
        const news = await newsModel.getNews(country, date);
        res.status(200).json({
            message: "successfull",
            news: news
        });


    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while fetching the news" });
    }
});

module.exports = router;
