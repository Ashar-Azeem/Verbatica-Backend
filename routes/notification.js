const express = require('express');
const router = express.Router();
//model
const notificationModel = require('../models/notification');


//Follow this template for the routes
router.post('/uploadNotification', async (req, res) => {
    try {
        //CODE HERE

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while uploading the notification" });
    }


});





module.exports = router;