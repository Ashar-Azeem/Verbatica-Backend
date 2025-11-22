const { esClient } = require('./init');
const createEmbeddings = require('./createEmbeddings')

async function indexPost(post) {
    const queryEmbedding = await createEmbeddings([post.title + " " + post.description]);
    await esClient.index({
        index: 'posts',
        id: post.id,
        document: {
            id: post.id,
            title: post.title,
            description: post.description,
            upload_at: post.upload_at,
            embeddings: queryEmbedding
        },
        refresh: true,
    });



    console.log(`Post ${post.id} indexed successfully`);
}

async function deletePost(postId) {
    try {
        await esClient.delete({
            index: 'posts',
            id: postId,
            refresh: 'wait_for'
        });
    } catch (error) {
        console.error(`Error deleting ad ${adId}:`, error);
        throw error;
    }
}
async function indexAd(ad) {
    const queryEmbedding = await createEmbeddings([ad.title + " " + ad.description]);
    await esClient.index({
        index: 'ads',
        id: ad.id,
        document: {
            id: ad.id,
            title: ad.title,
            description: ad.description,
            embeddings: queryEmbedding
        },
        refresh: true,
    });



    console.log(`Post ${ad.id} indexed successfully`);
}

async function updateAd(id, updates) {
    try {
        if (updates.title || updates.description) {
            const queryEmbedding = await createEmbeddings([updates.title + " " + updates.description]);
            updates.embeddings = queryEmbedding
        }

        await esClient.update({
            index: 'ads',
            id: id,
            doc: updates,
        });

        console.log(`Ad ${id} updated successfully`);

    } catch (error) {
        console.error(`Failed to update ad ${id}:`, error);
        throw error;
    }
}



module.exports = { indexPost, indexAd, updateAd, deletePost };
