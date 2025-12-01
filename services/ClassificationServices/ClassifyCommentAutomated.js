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
    let formattedComment = isNested ? formatComments(commentText) : `Text: ${commentText}`;

    // We inject the post context directly into the instruction to ground the model
    const prompt = `
    You are an AI Analyst for "Verbatica," a social platform. 
    Your goal is to categorize user comments into **STANCE-BASED NARRATIVES**.

    CONTEXT:
    The Post Title is: "${postTitle}"
    The Post Description is: "${postDescription}"

    THE TASK:
    Analyze the comment below and place it into a cluster that represents the user's **specific argument, opinion, or "side"**.

    *** IMPORTANT: THREAD LOGIC ***
    If the input contains a "Parent" text and a "Reply" (nested structure):
    1. READ the Parent text to understand the context.
    2. **CLASSIFY ONLY THE REPLY (The Child/Latest Comment).**
    3. Do NOT classify the Parent. The Parent is just there so you understand what the user is arguing against or supporting.

    CRITICAL RULES FOR CLUSTERING:
    1. **STANCE OVER TOPIC (Most Important):** - Do NOT name clusters after the *topic* (e.g., "Phone Discussion", "Feedback", "General Thoughts").
       - Name clusters after the *opinion* (e.g., "Preferring iPhone UI", "Criticizing Android Privacy", "Neutral/Questioning").
       - The cluster name must reveal *which side* of the argument the user is on.

    2. **AVOID "THE BLOB":**
       - If the cluster name is vague enough that *any* comment on this post could fit (e.g., "Tech Opinions"), IT IS WRONG. 
       - Be specific enough to separate opposing views.

    3. **MATCHING LOGIC:**
       - Only assign to an existing cluster if the comment shares the **SAME OPINION**.
       - If the comment is talking about the same *topic* but has a *different opinion*, create a NEW CLUSTER.
       - Example: If existing cluster is "Loves the Camera", and new comment is "Hates the Camera", do NOT put them together. Create "Criticizing Camera".

    4. **NAMING CONVENTION:**
       - Max 3-5 words. 
       - Action-oriented or Adjective-heavy (e.g., "Defending [Subject]", "Skeptical of [Feature]", "Demanding [Change]").

    ---------------------------------------
    INPUT DATA:
    Existing Clusters: ${clusters.length === 0 ? "None (This is the first comment. Set a specific precedent!)" : clusters.join(", ")}
    Available Tones: ${tones.join(", ")}
    
   Comment Structure to Classify:
    "${formattedComment}"
    ---------------------------------------

    OUTPUT FORMAT (JSON only, no markdown):
    {
        "Cluster": "string",
        "Tone": "string",
        "NewCluster": boolean
    }
    `;

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" } // Force JSON mode for reliability
        });

        const responseText = result.response.text();
        const responseData = JSON.parse(responseText);

        return {
            Cluster: responseData.Cluster,
            Tone: responseData.Tone,
            newCluster: responseData.NewCluster,
        };
    } catch (error) {
        console.error("Clustering Error:", error);
        // Fallback or retry logic here
        return { Cluster: "Uncategorized", Tone: "Neutral", newCluster: true };
    }
}

/**
 * Helper to format nested comments (Unchanged)
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