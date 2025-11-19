const Summary = require('../../models/summary');
const commentModel = require('../../models/comment');
const summaryGenerator = require('../Summary/summary');

async function generateSummary(oldSummary, newComments, postType, cluster) {
  const updatedSummary = await summaryGenerator(oldSummary, newComments, postType, cluster);
  return updatedSummary;
}

async function handleCommentSummary(postId, type, allNarratives = [], commentNarrative = null) {
  try {
    let postSummary = await Summary.findOne({ postId });

    if (!postSummary) {
      const summariesData =
        type === 'polarized'
          ? allNarratives.map(narrative => ({
            narrative,
            summary: null,
            commentCount: narrative === commentNarrative ? 1 : 0
          }))
          : [
            {
              summary: null,
              commentCount: 1
            }
          ];

      const newDoc = new Summary({
        postId,
        type,
        summaries: summariesData
      });

      await newDoc.save();
      console.log('✅ New summary document created.');
      return newDoc;
    }

    let targetSummary;

    if (type === 'polarized' && commentNarrative) {
      targetSummary = postSummary.summaries.find(
        s => s.narrative === commentNarrative
      );
    } else {
      targetSummary = postSummary.summaries[0];
    }

    targetSummary.commentCount += 1;

    if (targetSummary.commentCount >= 5) {
      const filter = { postId };

      if (commentNarrative) {
        filter.cluster = commentNarrative;
      }

      const comments = await commentModel.find(filter)
        .sort({ uploadTime: -1 })
        .limit(10)
        .lean();
      const formattedComments = comments.map((c) => c.text);

      targetSummary.summary = await generateSummary(targetSummary.summary, formattedComments, type, targetSummary.narrative);
      targetSummary.commentCount = 0;
    }

    await postSummary.save();
    return postSummary;
  } catch (err) {
    console.error('❌ Error updating summary:', err);
    throw err;
  }
}

module.exports = handleCommentSummary;
