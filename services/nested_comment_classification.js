const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINIKEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


async function classifyNestedComments(clusters, tones, comments) {
    const prompt = `
            You are analyzing nested discussion comments.

            Your task:
            - Classify each *leaf comment* (those that do not have replies)
            - For each comment, output a clear readable classification like:
            Comment ID: <id>
            Cluster: <chosen_cluster_from_list>
            Tone: <chosen_tone_from_list>
            -----

            Clusters: ${clusters.join(", ")}
            Tones: ${tones.join(", ")}

            Comments hierarchy:
            ${formatComments(comments)}
            `;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

// Helper function to print comment hierarchy nicely
function formatComments(comments, depth = 0) {
    let text = "";
    for (const comment of comments) {
        text += `${"  ".repeat(depth)}Comment ID: ${comment.id}\n`;
        text += `${"  ".repeat(depth)}Text: ${comment.text}\n`;
        if (comment.replies && comment.replies.length > 0) {
            text += `${"  ".repeat(depth)}Replies:\n`;
            text += formatComments(comment.replies, depth + 1);
        }
    }
    return text;
}

module.exports = classifyNestedComments



//Example:
// const clusters = ["withMilitary", "againstMilitary", "neutral"];
// const tones = ["Happy", "Sad", "Angry", "Neutral"];

// const commentHierarchy = [
//     {
//         id: "c1",
//         text: "The military’s involvement was justified given the chaos at the border.",
//         replies: [
//             {
//                 id: "c1r1",
//                 text: "Justified? They used excessive force on unarmed civilians!",
//                 replies: [
//                     {
//                         id: "c1r1r1",
//                         text: "You’re exaggerating. The civilians were throwing stones and blocking aid trucks.",
//                         replies: [
//                             {
//                                 id: "c1r1r1r1",
//                                 text: "Those were isolated incidents. Most people were peacefully protesting.",
//                                 replies: [
//                                     {
//                                         id: "c1r1r1r1r1",
//                                         text: "Even if that’s true, maintaining order was their duty. It’s not black and white.",

//                                     }
//                                 ]
//                             }
//                         ]
//                     }
//                 ]
//             }
//         ]
//     }
// ];


// (async () => {
//     const output = await classifyNestedComments(clusters, tones, commentHierarchy);
//     console.log(output);
// })();
