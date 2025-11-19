const express = require('express');
const summaryModel = require('../models/summary');
const router = express.Router();

router.get('/summary', async (req, res) => {
    try {
        const { postId } = req.body;
        const summaryDoc = await summaryModel.findOne({ postId: postId }).lean();
        res.status(200).json({ message: 'success', summary: summaryDoc });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'error', error: "Something went wrong while adding a comment" });

    }

});


module.exports = router;
