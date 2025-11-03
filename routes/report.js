const express = require('express');
const router = express.Router();
//model
const reportModel = require('../models/report');


//Follow this template for the routes
router.post('/uploadReport', async (req, res) => {
    try {
        //CODE HERE

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while uploading the report" });
    }


});





module.exports = router;