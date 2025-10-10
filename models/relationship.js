const connectAll = require('../Utilities/cloud/ConnectionToCloudResources');


const relationshipModel = {
    async followingAUser(followerId, followingId) {
        try {
            const { postgres } = await connectAll();
            const result = await postgres.query(
                `INSERT INTO users_following
            (follower_id,following_id)
            VALUES
            ($1,$2)
             RETURNING *`, [followerId, followingId]);

            if (result.rowCount > 0) {
                return true;
            } else {
                return false;
            }
        } catch (e) {
            throw Error(e);
        }
    },


    async unFollowingAUser(followerId, followingId) {
        try {
            const { postgres } = await connectAll();
            const result = await postgres.query(
                `DELETE FROM users_following WHERE follower_id = $1 AND "following_id"=$2`, [followerId, followingId]);
            if (result.rowCount > 0) {
                return true;
            } else {
                return false;
            }
        } catch (e) {
            throw Error(e);
        }
    },

    async checkFollowExists(followerId, followingId) {
        const { postgres } = await connectAll();

        const query = `
            SELECT EXISTS (
            SELECT 1 FROM users_following 
            WHERE follower_id = $1 AND following_id = $2
            ) AS "exists";
        `;

        try {
            const res = await postgres.query(query, [followerId, followingId]);
            return res.rows[0].exists;
        } catch (err) {
            console.error('Error checking follow status:', err);
            throw err;
        }
    }


}



module.exports = relationshipModel;