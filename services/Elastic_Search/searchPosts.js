const { esClient } = require("./init");


async function searchPosts(vectorEmbedding, min_score) {

    const searchRes = await esClient.search({
        index: "posts",
        size: 10,
        min_score: min_score,
        query: {
            knn: {
                field: "embeddings",
                query_vector: vectorEmbedding,
                k: 10,
                num_candidates: 100,
            },
        },
    });

    const recommendations = searchRes.hits.hits
        .map(hit => ({
            id: hit._source.id,
            title: hit._source.title,
            description: hit._source.description,
            score: hit._score,
            upload_at: hit._source.upload_at
        }));

    return recommendations;
}

module.exports = searchPosts;
