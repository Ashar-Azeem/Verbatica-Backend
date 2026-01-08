require('dotenv').config();
const es = require('./services/Elastic_Search/init');
const createEmbeddings = require('./services/Elastic_Search/createEmbeddings');
const connectAll = require('./Utilities/cloud/ConnectionToCloudResources');

async function migrateAdsData() {
    await es.initElasticsearch();
    const { postgres } = await connectAll();

    try {
        // 1. Fetch current IDs from the 'ads' index
        const response = await es.esClient.search({
            index: 'ads', // Target index changed to ads
            _source: false,
            size: 10000,
            query: { match_all: {} }
        });

        const existingIds = new Set();
        response.hits.hits.forEach(hit => {
            // Store the ES _id as a string for comparison
            existingIds.add(hit._id.toString());
        });

        console.log(`Total unique IDs found in ES (ads): ${existingIds.size}`);

        // 2. Fetch data from Postgres (assumes table is also 'ads')
        const { rows: ads } = await postgres.query('SELECT * FROM ads');

        // 3. Filter: Use 'ad_id' instead of 'post_id'
        const newAds = ads.filter(ad => !existingIds.has(ad.ad_id.toString()));

        if (newAds.length === 0) {
            console.log('No new ads to sync.');
            return;
        }

        console.log(`Starting sync for ${newAds.length} new ads...`);

        // 4. Loop through and index
        for (const doc of newAds) {
            console.log(`Processing Ad ID: ${doc.ad_id}`);

            try {
                // Adjust text fields based on your Ads table schema
                const combinedText = `${doc.title || ''} ${doc.description || ''}`;
                const queryEmbedding = await createEmbeddings([combinedText]);

                await es.esClient.index({
                    index: 'ads', // Target index
                    id: doc.ad_id, // Ensure ID is a string to prevent duplicates
                    document: {
                        id: doc.ad_id,
                        title: doc.title,
                        description: doc.description,
                        embeddings: queryEmbedding
                    },
                    refresh: 'wait_for',
                });

                console.log(`Successfully indexed Ad: ${doc.ad_id}`);
            } catch (err) {
                console.error(`Failed to index Ad ${doc.ad_id}:`, err.message);
            }
        }

        console.log('Ads migration completed successfully.');

    } catch (err) {
        console.error('Ads migration failed:', err);
    }
}

migrateAdsData();