const classify = require("./services/ClassificationServices/ClassifyCommentAutomated");
require('dotenv').config();

(async () => {
    const singleComment = "At least some projects might get funded though.";

    // 2️⃣ Nested comments (one leaf per request)
    const nestedComment = {
        text: "This government will never use the tax money honestly.",
        replies: [
            {
                text: "I feel like they will use this money on the countries growth",
                replies: []
            }
        ]
    };
    const results = await classify({
        clusters: ['Budget & Infrastructure', 'Tax Spending Accountability'],
        tones: ["Happy", "Sad", "Angry", "Neutral"], commentText: nestedComment,
        postTitle: "Government Announces New Fuel Tax Increase Starting Next Month",
        postDescription: "The finance ministry has approved a 12% rise in fuel taxes to offset budget deficits and fund public infrastructure projects."

    });
    console.log(results);
})();

