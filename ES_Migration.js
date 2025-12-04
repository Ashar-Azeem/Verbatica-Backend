const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

// ----------------- CONFIG -----------------
const localClient = new Client({ node: 'http://localhost:9200' });
const cloudClient = new Client({
    node: process.env.ELASTICSEARCHROUTECLOUD,
    auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY,
    },
});

const indices = ['posts', 'ads'];
// -----------------------------------------

/**
 * Executes a simple search to find the IDs of all documents in an index.
 * This is a reliable alternative to scrollSearch.
 * @param {string} index The name of the index.
 * @returns {string[]} An array of document IDs.
 */
async function getDocumentIds(index) {
    console.log("  -> Fetching all document IDs using the reliable search API...");
    try {
        const searchResponse = await localClient.search({
            index,
            size: 10000, // Max size for fetching IDs
            _source: false,
            body: {
                query: { match_all: {} }
            }
        });

        if (searchResponse.hits && searchResponse.hits.hits) {
            return searchResponse.hits.hits.map(hit => hit._id).filter(id => id !== undefined);
        }
        return [];
    } catch (err) {
        console.error(`🚨 ERROR: Failed to fetch IDs from local index ${index}.`, err.message);
        return [];
    }
}

/**
 * Main migration function using the robust search-and-get pattern.
 */
async function migrateIndex(index) {
    try {
        console.log(`\n=== Migrating index: ${index} ===`);

        // 1. Index Creation (Handling the 'already exists' error gracefully)
        const exists = await cloudClient.indices.exists({ index });
        if (!exists.body) {
            try {
                const mappingResponse = await localClient.indices.getMapping({ index });
                const mapping = mappingResponse[index].mappings;

                await cloudClient.indices.create({ index, body: { mappings: mapping } });
                console.log(`Created cloud index: ${index} (using local mapping)`);
            } catch (mappingError) {
                // Ignore the resource_already_exists_exception, but log others
                if (mappingError.statusCode !== 400 || !mappingError.message.includes('resource_already_exists_exception')) {
                    console.error(`Could not retrieve or apply mapping for index ${index}.`, mappingError);
                } else {
                    console.log(`Cloud index already exists: ${index}`);
                }
            }
        } else {
            console.log(`Cloud index already exists: ${index}`);
        }

        // 2. Get all Document IDs
        const allIds = await getDocumentIds(index);
        console.log(`  -> Found ${allIds.length} valid document IDs.`);

        if (allIds.length === 0) {
            console.log(`No documents found in local index: ${index}`);
            return;
        }

        // 3. Prepare Bulk Request by fetching documents one-by-one
        const bulkBody = [];
        let successfulFetchCount = 0;
        let failedFetchCount = 0;

        for (const id of allIds) {
            try {
                // Fetch the complete source for the document
                const getResponse = await localClient.get({ index, id });
                const source = getResponse._source;

                if (source) {
                    // Add metadata and source to the bulk body
                    bulkBody.push(
                        { index: { _index: index, _id: id } },
                        source
                    );
                    successfulFetchCount++;
                } else {
                    // Document exists but has no source (should be very rare now)
                    console.warn(`[SKIP FETCH] ID ${id} has no _source body.`);
                    failedFetchCount++;
                }
            } catch (err) {
                // Document ID was found, but GET failed (internal corruption)
                console.warn(`[SKIP FETCH] Failed to GET document ID ${id}. Skipping. Error: ${err.message}`);
                failedFetchCount++;
            }
        }

        console.log(`Prepared ${successfulFetchCount} documents for migration.`);
        if (failedFetchCount > 0) {
            console.warn(`Note: ${failedFetchCount} documents were skipped due to missing or inaccessible source.`);
        }

        if (bulkBody.length === 0) {
            console.log(`No documents to insert.`);
            return;
        }

        // 4. Perform Bulk Insert to Cloud
        const docsToMigrate = bulkBody.length / 2;
        const bulkResponse = await cloudClient.bulk({ refresh: true, body: bulkBody });

        if (bulkResponse.errors) {
            console.error('Errors occurred during bulk insert (Likely a data type conflict):');
            for (const item of bulkResponse.items) {
                if (item.index && item.index.error) {
                    console.error(`[BULK ERROR] Index ${item.index._index}, Doc ID ${item.index._id}:`);
                    console.error(JSON.stringify(item.index.error, null, 2));
                }
            }
        } else {
            console.log(`Successfully migrated ${docsToMigrate} documents to cloud index: ${index}`);
        }
    } catch (err) {
        console.error(`Error migrating index ${index}:`, err);
    }
}

(async () => {
    for (const index of indices) {
        await migrateIndex(index);
    }
    console.log('\n✅ Migration completed!');
})();