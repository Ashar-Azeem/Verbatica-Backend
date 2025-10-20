const connectAll = require('../Utilities/cloud/ConnectionToCloudResources');
const recommendAd = require('../services/Elastic_Search/recommendPosts');
const postModel = require('./post');

const adsModel = {
    async getAd(userId, page, vector) {
        try {
            const { postgres } = await connectAll();
            const query = `
            SELECT
            a.ad_id, 
            a.title,
            a.description,
            a.countries,
            a.genders,
            a.upload_date,
            a.plan,
            a.image_url,
            a.video_url,
            a.redirect_link,
            a.total_impressions,
            a.total_clicks,
            o.brand_name,
            o.brand_avatar_location
            FROM ads a 
            JOIN business_owner o ON a.owner_id=o.id AND a."isApproved"=TRUE
            JOIN users u ON u.id = $1
            WHERE
            (
                cardinality(a.countries) = 0
                OR u.country = ANY(a.countries)
            )
            AND
            (
                cardinality(a.genders) = 0
                OR u.gender = ANY(a.genders)
            )
            AND
            (NOW() <= a.upload_date + (a.plan * INTERVAL '1 day'))
            `;

            const { rows } = await postgres.query(query, [userId]);


            let history = [];
            if (!vector) {
                history = await postModel.getHistoryPosts(userId);
            }


            result = await recommendAd.recommendAd(history, page, rows, vector);

            if (!result.ad) {
                return { vector: result.vector, ad: null };
            }
            for (const ad of rows) {
                if (ad.ad_id == result.ad.id) {
                    return { vector: result.vector, ad: ad }
                }
            }

        } catch (e) {
            console.log(e);
        }
    },
    async insertAd(title, description, countries, genders, plan, image, video, redirectLink, ownerId) {
        try {
            const { postgres } = await connectAll();
            const query = `
        INSERT INTO ads (
          title, 
          description, 
          countries, 
          genders, 
          upload_date, 
          plan, 
          image_url, 
          video_url, 
          redirect_link, 
          total_impressions, 
          total_clicks, 
          owner_id,
          "isApproved"
        ) VALUES (
          $1, $2, $3, $4, NOW(), $5, $6, $7, $8, 0, 0, $9,TRUE
        )
        RETURNING *;
      `;

            const values = [
                title,
                description,
                countries,
                genders,
                plan,
                image,
                video,
                redirectLink,
                ownerId,
            ];

            const result = await postgres.query(query, values);
            return result.rows[0]; // return inserted ad

        } catch (e) {
            console.log(e);
        }
    },
    async getAdsById(ownerUserId) {
        try {
            const { postgres } = await connectAll();
            const query = `
            SELECT 
            a.ad_id, 
            a.title,
            a.description,
            a.countries,
            a.genders,
            a.upload_date,
            a.plan,
            a.image_url,
            a.video_url,
            a.redirect_link,
            a.total_impressions,
            a.total_clicks,
            a."isApproved",
            o.brand_name,
            o.brand_avatar_location
            FROM ads a JOIN
            business_owner o ON a.owner_id=o.id AND a.owner_id =$1
            ORDER BY a.upload_date DESC
            `;

            const { rows } = await postgres.query(query, [ownerUserId]);

            if (rows.length == 0) {
                return [];
            }

            return rows;

        } catch (e) {
            console.log(e);
        }

    },

    async deleteAdById(adId) {
        try {
            const { postgres } = await connectAll();
            const query = 'DELETE FROM ads WHERE ad_id = $1 RETURNING *';
            const values = [adId];
            const result = await postgres.query(query, values);

            if (result.rowCount > 0) {
                return { ad: result.rows[0], isDeleted: true };
            } else {
                return { ad: null, isDeleted: false };
            }
        } catch (err) {
            console.error('Error deleting ad:', err);
        }
    }
}


module.exports = adsModel;