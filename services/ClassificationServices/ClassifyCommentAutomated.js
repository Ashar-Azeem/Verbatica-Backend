const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINIKEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


async function smartCommentClassifier({
    clusters = [],
    tones = [],
    commentText,
    postTitle,
    postDescription,
}) {
    const isNested = typeof commentText === "object";

    let formattedComment = "";

    if (isNested) {
        formattedComment = formatComments(commentText);
    } else {
        formattedComment = `Text: ${commentText}`;
    }

    const prompt = `
           You are classifying a single comment into a cluster that represents a BROAD NARRATIVE or OPINION THEME about the post — not a specific sentence or detail in the comment.

            IMPORTANT RULES:

            1. **Cluster Philosophy**
            - Clusters should represent HIGH-LEVEL NARRATIVES about the post (e.g., “Performance Feedback”, “UI Criticism”, “Feature Requests”), NOT exact details of the comment.
            - Clusters must be driven primarily by:
                - The Post Title
                - The Post Description
            - All initial clusters must be GENERAL ENOUGH to absorb multiple future comments.

            2. **If NO clusters exist yet:**
            - Generate a BROAD narrative cluster that reflects **a major theme likely to appear in discussions of this post**.
            - It must NOT be specific to the exact wording of the comment.
            - Think: “What category of discussions would people generally have about this post?”

            3. **If clusters DO exist:**
            - Assign the comment to an existing cluster if it can reasonably fit.
            - Only generate a NEW cluster if:
                - The comment introduces a new narrative not covered before.
            - New clusters must stay broad, narrative-like, and non-redundant.

            4. **Tone Assignment**
            - Always pick a tone from the provided tones list.

            5. **Cluster Length**
            - Max 25–30 characters.
            - Still must reflect a broad theme.

            6. If there are nested comments, classify only the **leaf comments** (those without replies)

            ---------------------------------------
            OUTPUT FORMAT (STRICT):
            Cluster: <cluster_name>
            Tone: <tone_name>
            NewCluster: <yes/no>
            ---------------------------------------

            Existing Clusters:
            ${clusters.length === 0 ? "None" : clusters.join(", ")}

            Available Tones:
            ${tones.join(", ")}

            Post Title: ${postTitle}
            Post Description: ${postDescription}

            Comment to classify:
            "${formattedComment}"

            `;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const clusterMatch = response.match(/Cluster:\s*(.+)/);
    const toneMatch = response.match(/Tone:\s*(.+)/);
    const newMatch = response.match(/NewCluster:\s*(.+)/);

    return {
        Cluster: clusterMatch ? clusterMatch[1].trim() : null,
        Tone: toneMatch ? toneMatch[1].trim() : null,
        newCluster: newMatch ? newMatch[1].trim().toLowerCase() === "yes" : false,
    };
}

/**
 * Helper to format nested comments
 */
function formatComments(comment, depth = 0) {
    let text = `${"  ".repeat(depth)}Text: ${comment.text}\n`;

    if (comment.replies && comment.replies.length > 0) {
        text += `${"  ".repeat(depth)}Replies:\n`;
        for (const reply of comment.replies) {
            text += formatComments(reply, depth + 1);
        }
    }

    return text;
}

module.exports = smartCommentClassifier;
