require('dotenv').config();
const es = require('./services/Elastic_Search/init');

async function cleanAdsIndex() {
    await es.initElasticsearch();

    // The specific IDs you want to KEEP in the 'ads' index
    const idsToKeep = ["19", "20", "21", "22", "23", "24"];

    try {
        console.log(`Cleaning 'ads' index... Keeping only: ${idsToKeep.join(', ')}`);

        const response = await es.esClient.deleteByQuery({
            index: 'ads', // Targeting the ads index
            refresh: true,
            body: {
                query: {
                    bool: {
                        // "Delete everything that IS NOT in this list"
                        must_not: {
                            ids: {
                                values: idsToKeep
                            }
                        }
                    }
                }
            }
        });

        console.log("--- Cleanup Results ---");
        console.log(`Documents Deleted: ${response.deleted}`);
        console.log(`Documents Remaining: ${idsToKeep.length} (expected)`);

    } catch (err) {
        // If the index 'ads' doesn't exist yet, it will throw a 404
        if (err.meta && err.meta.statusCode === 404) {
            console.error("Error: The index 'ads' was not found.");
        } else {
            console.error("Migration/Cleanup failed:", err);
        }
    }
}

cleanAdsIndex();