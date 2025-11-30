const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINIKEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


async function classifyComment(clusters, tones, comment) {
    const isNested = typeof comment === "object";

    let formattedComment = "";

    if (isNested) {
        formattedComment = formatComments(comment);
    } else {
        formattedComment = `Text: ${comment}`;
    }

    const prompt = `
            You are analyzing discussion comments.

            Your tasks:
            - If there are nested comments, classify only the **leaf comments** (those without replies)
            - If it's a single comment, simply classify it.
            - Output must always be:

            Cluster: <chosen_cluster_from_list>
            Tone: <chosen_tone_from_list>

            Clusters: ${clusters.join(", ")}
            Tones: ${tones.join(", ")}

            Comment Structure:
            ${formattedComment}
            `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const clusterMatch = responseText.match(/Cluster:\s*(.*)/);
    const toneMatch = responseText.match(/Tone:\s*(.*)/);

    return {
        Cluster: clusterMatch ? clusterMatch[1].trim() : null,
        Tone: toneMatch ? toneMatch[1].trim() : null,
    };
}

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

module.exports = classifyComment;
