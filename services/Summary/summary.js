const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINIKEY);
const MODEL = "gemini-2.5-flash-lite";

async function generateSummaryPrompt(comments, postType = "non_polarized", cluster) {
    const commentsText = comments.map((c) => `- ${c}`).join("\n");

    return postType === "polarized"
        ? `You are an analytical summarizer. Summarize these user comments about a polarized topic. 
                     Write a concise paragraph capturing key opinions and recurring arguments of cluster: ${cluster}.
                     Comments:
                     ${commentsText}
                       Final Summary (no intro text):`

        : `You are a summarizer. Generate clear bullet points summarizing all key aspects 
                        of these comments. Combine similar ideas, avoid repetition, and keep tone neutral.
                        Comments:
                        ${commentsText}
                        Final Bullet-point Summary (no intro text):`;
}

async function updateSummaryPrompt(oldSummary, newComments, postType = "non_polarized", cluster) {
    const commentsText = newComments.map((c) => `- ${c}`).join("\n");

    return postType === "polarized"
        ? `You are an analytical summarizer updating a polarized discussion summary.
                     You are given an existing summary and new user comments.
                     Merge key arguments, opinions, and sentiments from the new comments into the summary of cluster: ${cluster}.
                    Preserve all major viewpoints and avoid repetition.
                    Previous Summary:
                    ${oldSummary}
                    New Comments:
                    ${commentsText}
                    Updated Summary (no intro text):`
        : `You are a summarizer updating a neutral discussion summary.
                    You are given an existing summary and new comments.
                    Merge any new insights or feedback into the existing summary, removing redundancy.
                    Previous Summary:
                    ${oldSummary}
                    New Comments:
                    ${commentsText}
                    Updated Summary (no intro text):`;
}

async function summarizeOrUpdate(oldSummary, newComments, postType, cluster) {
    const model = genAI.getGenerativeModel({ model: MODEL });

    const prompt = oldSummary
        ? await updateSummaryPrompt(oldSummary, newComments, postType, cluster)
        : await generateSummaryPrompt(newComments, postType, cluster);

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}


module.exports = summarizeOrUpdate;



// // //Testing:
// const oldSummary = `
// - Users appreciate the smoother scrolling and quicker startup time after the latest update.
// - The redesigned settings menu makes navigation easier.
// - Some users mentioned improved notification reliability and fewer missed alerts.
// - A few complaints remain about occasional lag when uploading photos.
// - Overall, feedback leans positive, focusing on better stability and responsiveness.
// `;

// const newComments = [
//     "The photo upload lag is mostly gone now — great improvement!",
//     "Finally, the app doesn’t freeze when switching between tabs.",
//     "Battery usage is still a bit high compared to before.",
//     "The search feature is so much faster and actually gives relevant results.",
//     "I love the new animations; everything feels smoother.",
//     "Still getting double notifications sometimes, please fix this.",
//     "Font readability in dark mode is perfect now.",
//     "It loads faster, but the app icon looks outdated now.",
//     "The download progress bar for videos is a neat addition.",
//     "No more crashes on Android 14, big thumbs up!",
//     "Scrolling reels feels natural, but transitions could be quicker.",
//     "Can we get a filter option in the media gallery?",
//     "Liking the subtle sound effects — feels more premium.",
//     "The onboarding tutorial helped a lot, very user-friendly.",
//     "Overall, the app feels more stable, but minor UI polish is still needed."
// ];



// (async () => {
//     const summary = await summarizeOrUpdate(null, newComments);
//     console.log("\n🆕 Updated Summary:\n", summary);
// })();

