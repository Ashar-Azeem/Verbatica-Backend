const { Client } = require('@elastic/elasticsearch');

const esClient = new Client({
    //CHANGE THE IP TO THE CLOUD IP THAT WE WOULD BE USING
    node: 'http://localhost:9200',
});

async function initElasticsearch() {
    try {
        const exists = await esClient.indices.exists({ index: 'posts' });
        const adsExist = await esClient.indices.exists({ index: 'ads' });

        if (!exists) {

            await esClient.indices.create({
                index: 'posts',
                body: {
                    settings: {
                        analysis: {
                            filter: {
                                english_stop: {
                                    type: "stop",
                                    stopwords: "_english_"
                                },
                                english_stemmer: {
                                    type: "stemmer",
                                    language: "english"
                                }
                            },
                            analyzer: {
                                custom_english: {
                                    tokenizer: "standard",
                                    filter: ["lowercase", "english_stop", "english_stemmer"]
                                }
                            }
                        }
                    },
                    mappings: {
                        properties: {
                            id: { type: "keyword" },
                            title: { type: "text", analyzer: "custom_english" },
                            description: { type: "text", analyzer: "custom_english" },
                            upload_at: { type: "date" },

                            // 🔹 New embeddings field
                            embeddings: {
                                type: "dense_vector",
                                dims: 384,   // MiniLM output dimension
                                index: true, // allows ANN (approx nearest neighbor) search
                                similarity: "cosine" // can be dot_product or l2_norm
                            }
                        }
                    }
                }
            });

        } else if (!adsExist) {
            await esClient.indices.create({
                index: 'ads',
                body: {
                    settings: {
                        analysis: {
                            filter: {
                                english_stop: {
                                    type: "stop",
                                    stopwords: "_english_"
                                },
                                english_stemmer: {
                                    type: "stemmer",
                                    language: "english"
                                }
                            },
                            analyzer: {
                                custom_english: {
                                    tokenizer: "standard",
                                    filter: ["lowercase", "english_stop", "english_stemmer"]
                                }
                            }
                        }
                    },
                    mappings: {
                        properties: {
                            id: { type: "keyword" },
                            title: { type: "text", analyzer: "custom_english" },
                            description: { type: "text", analyzer: "custom_english" },

                            // 🔹 New embeddings field
                            embeddings: {
                                type: "dense_vector",
                                dims: 384,   // MiniLM output dimension
                                index: true, // allows ANN (approx nearest neighbor) search
                                similarity: "cosine" // can be dot_product or l2_norm
                            }
                        }
                    }
                }
            });
        }
        else {
        }
    } catch (err) {
        console.error("Error initializing Elasticsearch:", err);
    }
}

module.exports = { esClient, initElasticsearch };
