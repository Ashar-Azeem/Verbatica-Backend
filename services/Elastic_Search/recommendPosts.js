const { esClient } = require("./init");


async function recommendPosts(history, k = 10, page = 1, lastDoc = undefined, vector = undefined) {
    let finalVector;
    //if first page then make a vector from the given history posts 
    if (!vector) {
        const vectors = [];
        const weights = [];

        //change for production
        const minHistoryForDecay = 3;

        const now = Date.now();

        for (const { id, watched_at } of history) {
            const res = await esClient.get({
                index: "posts",
                id,
                _source: ["embeddings"],
            });

            if (!res || !res._source || !res._source.embeddings) continue;

            const vector = res._source.embeddings;

            //Apply decay when history is of a certain length
            if (history.length > minHistoryForDecay) {
                const daysOld = (now - new Date(watched_at).getTime()) / (1000 * 60 * 60 * 24);
                const recencyWeight = 1 / (1 + daysOld); // newer = higher weight

                vectors.push(vector.map(v => v * recencyWeight));
                weights.push(recencyWeight);
            }
            //Push the vector as it is
            else {
                vectors.push(vector);
            }
        }

        if (vectors.length === 0) {
            throw new Error("No embeddings found for history posts.");
        }

        // Weighted average embeddings
        finalVector = vectors[0].map(() => 0); // initialize zero vector
        for (const vec of vectors) {
            finalVector = finalVector.map((x, i) => x + vec[i]);
        }
        //Apply decay when history is of a certain length
        if (history.length > minHistoryForDecay) {
            const weightSum = weights.reduce((a, b) => a + b, 0);
            finalVector = finalVector.map(x => x / weightSum);
        }
    } else {
        finalVector = vector;
    }
    const searchRes = await esClient.search({
        index: "posts",
        size: k,
        min_score: 0.2,
        query: {
            knn: {
                field: "embeddings",
                query_vector: finalVector,
                k: page * k,
                num_candidates: page * 100,
                filter: {
                    bool: {
                        must_not: {
                            terms: { id: history.map(h => h.id) }
                        }
                    }
                }
            },
        },
        sort: [
            { "_score": "desc" },
            { "upload_at": "desc" }
        ],
        search_after: lastDoc ? [lastDoc.score, lastDoc.upload_at] : undefined,
    });

    const recommendations = {
        vector: finalVector, posts: searchRes.hits.hits
            .map(hit => ({
                id: hit._source.id,
                title: hit._source.title,
                description: hit._source.description,
                score: hit._score,
                upload_at: hit._source.upload_at,
            }))
    };

    return recommendations;
}

async function recommendAd(history, page = 1, adsPool, vector = undefined) {
    let finalVector;
    //if first page then make a vector from the given history posts 
    if (!vector) {
        const vectors = [];
        const weights = [];

        //change for production
        const minHistoryForDecay = 3;

        const now = Date.now();

        for (const { id, watched_at } of history) {
            const res = await esClient.get({
                index: "posts",
                id,
                _source: ["embeddings"],
            });

            if (!res || !res._source || !res._source.embeddings) continue;

            const vector = res._source.embeddings;

            //Apply decay when history is of a certain length
            if (history.length > minHistoryForDecay) {
                const daysOld = (now - new Date(watched_at).getTime()) / (1000 * 60 * 60 * 24);
                const recencyWeight = 1 / (1 + daysOld); // newer = higher weight

                vectors.push(vector.map(v => v * recencyWeight));
                weights.push(recencyWeight);
            }
            //Push the vector as it is
            else {
                vectors.push(vector);
            }
        }

        if (vectors.length === 0) {
            return { vector: null, ad: null };
        }

        // Weighted average embeddings
        finalVector = vectors[0].map(() => 0); // initialize zero vector
        for (const vec of vectors) {
            finalVector = finalVector.map((x, i) => x + vec[i]);
        }
        //Apply decay when history is of a certain length
        if (history.length > minHistoryForDecay) {
            const weightSum = weights.reduce((a, b) => a + b, 0);
            finalVector = finalVector.map(x => x / weightSum);
        }
    } else {
        finalVector = vector;
    }
    const searchRes = await esClient.search({
        index: "ads",
        size: page,
        min_score: 0.2,
        query: {
            knn: {
                field: "embeddings",
                query_vector: finalVector,
                k: page,
                num_candidates: page * 20,
                filter: {
                    bool: {
                        must: {
                            terms: { id: adsPool.map(ap => ap.ad_id) }
                        }
                    }
                }
            },
        },
    });
    const ad = searchRes.hits.hits[page - 1];
    const recommendation = {
        vector: finalVector, ad: ad ? {
            id: ad._source.id, title: ad._source.title,
            description: ad._source.description,
            score: ad._score,
        } : null
    };

    return recommendation;
}

module.exports = { recommendPosts, recommendAd };
