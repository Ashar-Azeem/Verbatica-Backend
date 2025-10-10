const connectAll = require('../Utilities/cloud/ConnectionToCloudResources');


const newsModel = {
    async insertOrUpdateNews(news, country) {
        const query = `
                INSERT INTO news (id, title, description, url, image, source_name, source_url, created_at,country)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9)
                ON CONFLICT (id)
                DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                created_at = EXCLUDED.created_at
                RETURNING *;
            `;
        const values = [
            news.id,
            news.title,
            news.description,
            news.url,
            news.image,
            news.sourceName,
            news.sourceUrl,
            new Date(),
            country
        ];

        try {
            const { postgres } = await connectAll();

            await postgres.query(query, values);

        } catch (err) {
            console.error("Error inserting/updating news:", err);
            throw err;
        }
    },

    async getNews(country, date) {


        const query = `
        SELECT * FROM news WHERE country=$1 AND created_at=$2`;

        const values = [country, date];
        try {
            const { postgres } = await connectAll();

            const result = await postgres.query(query, values);
            news = result.rows;
            return news;

        } catch (err) {
            console.error("Error inserting/updating news:", err);
            throw err;
        }



    }


}
module.exports = newsModel