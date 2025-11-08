const { GoogleGenerativeAI } = require("@google/generative-ai");
const { response } = require("express");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINIKEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


async function classifyNestedComments(clusters, tones, comment) {
    console.log(formatComments(comment));
    const prompt = `
            You are analyzing nested discussion comments.

            Your task:
            - Classify each *leaf comment* (those that do not have replies)
            - For each comment, output a clear readable classification like:
            Cluster: <chosen_cluster_from_list>
            Tone: <chosen_tone_from_list>
            

            Clusters: ${clusters.join(", ")}
            Tones: ${tones.join(", ")}

            Comments hierarchy:
            ${formatComments(comment)}
            `;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const clusterMatch = response.match(/Cluster:\s*(.*)/);
    const toneMatch = response.match(/Tone:\s*(.*)/);

    const cluster = clusterMatch ? clusterMatch[1].trim() : null;
    const tone = toneMatch ? toneMatch[1].trim() : null;
    return {
        Cluster: cluster,
        Tone: tone
    }
}

// Helper function to print comment hierarchy nicely
function formatComments(comment, depth = 0) {
    let text = "";
    text += `${"  ".repeat(depth)}Text: ${comment.text}\n`;
    if (comment.replies && comment.replies.length > 0) {
        text += `${"  ".repeat(depth)}Replies:\n`;
        text += formatComments(comment.replies[0], depth + 1);
    }
    return text;
}

module.exports = classifyNestedComments

