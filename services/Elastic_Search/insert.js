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

module.exports = { indexPost, indexAd };
