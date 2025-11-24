const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINIKEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


async function classifyParentComment(clusters, tones, comment) {
    const prompt = `
        You are analyzing discussion comments.

        Your task:
        - Classify this parent comment
        - Output in a clear readable format:
        Cluster: <chosen_cluster_from_list>
        Tone: <chosen_tone_from_list>

        Clusters: ${clusters.join(", ")}
        Tones: ${tones.join(", ")}

        Comment:
        Text: ${comment}
        `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const clusterMatch = responseText.match(/Cluster:\s*(.*)/);
    const toneMatch = responseText.match(/Tone:\s*(.*)/);

    const cluster = clusterMatch ? clusterMatch[1].trim() : null;
    const tone = toneMatch ? toneMatch[1].trim() : null;

    return {
        Cluster: cluster,
        Tone: tone
    };
}

module.exports = classifyParentComment;
