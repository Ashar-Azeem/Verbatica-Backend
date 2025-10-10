const connectAll = require('../Utilities/cloud/ConnectionToCloudResources');
const { sendOTP } = require('../Utilities/auth/NodeMailer');
const { generateOTP } = require('../Utilities/auth/GenerateOtp');



const businessOwnerModel = {
    async register(email, password, brandName, brandDescription, brandAvatarLoc) {
        try {
            const { postgres } = await connectAll();
            const joinDate = new Date().toISOString().split('T')[0];
            const result = await postgres.query(
                `INSERT INTO business_owner 
                (email, password, brand_name, brand_description, brand_avatar_location, "isVerified",joined_since)
                VALUES 
                ($1, $2, $3, $4, $5, $6,$7)
                RETURNING *`,
                [email, password, brandName, brandDescription, brandAvatarLoc, false, joinDate]
            );

            return result.rows[0];
        } catch (e) {
            throw new Error("Something went wrong while signing up");
        }
    },

    async ownerExistsViaEmail(email) {
        const { postgres } = await connectAll();
        const result = await postgres.query(
            `SELECT EXISTS (
            SELECT 1 FROM business_owner WHERE email = $1 AND "isVerified"=TRUE
             ) AS "exists"`,
            [email]
        );

        return result.rows[0].exists;
    },

    async ownerExistsViaBrandName(brandName) {
        const { postgres } = await connectAll();
        const result = await postgres.query(
            `SELECT EXISTS (
            SELECT 1 FROM business_owner WHERE brand_name = $1 AND "isVerified"=TRUE
             ) AS "exists"`,
            [brandName]
        );

        return result.rows[0].exists;
    },

    async sendOtpAndSaveInDB(email) {
        const { postgres } = await connectAll();

        const otp = generateOTP();
        const query = `
            INSERT INTO "OTP" (email, otp)
            VALUES ($1, $2)
            ON CONFLICT (email)
            DO UPDATE SET
            otp = EXCLUDED.otp;
        `;
        const values = [email, otp];

        try {
            const res = await postgres.query(query, values);
            sendOTP(email, otp);
        } catch (err) {
            console.error('Error during upsert:', err);
            throw new Error('Something went wrong while sending otp');

        }
    },

    async getOtp(email) {
        const { postgres } = await connectAll();
        const result = await postgres.query('SELECT * FROM "OTP" WHERE email = $1', [email]);

        if (result.rows.length > 0) {
            return result.rows[0];
        } else {
            throw new Error('Something went wrong');

        }

    },

    async deleteAndGetVerifiedBusiness(id, email) {
        const { postgres } = await connectAll();
        const client = await postgres.connect();

        try {
            await client.query('BEGIN');


            await client.query(
                `UPDATE business_owner SET "isVerified"=$1 WHERE id = $2`,
                [true, id]
            );

            await client.query(
                `DELETE FROM business_owner WHERE email = $1 AND "isVerified" = false`,
                [email]
            );

            await client.query(`DELETE FROM "OTP" WHERE email = $1`,
                [email])

            // Get the verified one
            const result = await client.query(
                `SELECT * FROM business_owner WHERE id=$1`,
                [id]
            );

            await client.query('COMMIT');
            return result.rows[0]; // or result.rows for all matching

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Transaction error:', err);
            throw err;
        } finally {
            client.release();
        }
    },
    async login(email) {
        const { postgres } = await connectAll();

        const result = await postgres.query('SELECT * FROM business_owner WHERE email = $1 AND "isVerified"=TRUE ', [email]);

        if (result.rows.length > 0) {
            return result.rows[0];
        } else {
            return null;
        }

    },
    async updatePasswordAndClearOTP(userId, email, password) {
        const { postgres } = await connectAll();
        const client = await postgres.connect();

        try {

            await client.query('BEGIN');
            await client.query(
                `UPDATE business_owner SET password=$1 WHERE id = $2`,
                [password, userId]
            );
            await client.query(`DELETE FROM "OTP" WHERE email = $1`,
                [email])

            const result = await client.query(
                `SELECT * FROM business_owner WHERE id=$1`,
                [userId]
            );
            await client.query('COMMIT');

            return result.rows[0];

        } catch (e) {
            await client.query('ROLLBACK');
            console.log(e);
        } finally {
            client.release();
        }
    },

    async updateProfile(brandOwnerId, brandName, brandDescription, brandCoverUrl, brandAvatarUrl) {
        const { postgres } = await connectAll();

        const query = `
            UPDATE business_owner
            SET 
            brand_name = $1,
            brand_description = $2,
            brand_cover_location = COALESCE($3, brand_cover_location),
            brand_avatar_location = COALESCE($4, brand_avatar_location)
            WHERE id = $5
            RETURNING *;
        `;

        const values = [brandName, brandDescription, brandCoverUrl, brandAvatarUrl, brandOwnerId];

        try {
            const result = await postgres.query(query, values);
            return result.rows[0];
        } catch (err) {
            console.error('Error updating owner_user:', err);
            throw err;
        }
    }

};



module.exports = businessOwnerModel;
