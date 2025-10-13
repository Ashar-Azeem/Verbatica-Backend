const connectAll = require('../Utilities/cloud/ConnectionToCloudResources');
const { sendOTP } = require('../Utilities/auth/NodeMailer');
const { generateOTP } = require('../Utilities/auth/GenerateOtp');

const UserModel = {
    async register(email, password, userName, country, gender) {
        try {
            const { postgres } = await connectAll();
            const joinDate = new Date().toISOString().split('T')[0];
            const result = await postgres.query(
                `INSERT INTO users 
                (email, password, "userName", country, gender, "isVerified",about,"joinDate","isGoogleSignIn",public_key)
                VALUES 
                ($1, $2, $3, $4, $5, $6,$7,$8,$9,$10)
                RETURNING *`,
                [email, password, userName, country, gender, false, "ohhhhh! I am cool and mysterious", joinDate, false, ""]
            );

            return result.rows[0];
        } catch (e) {
            throw new Error("Something went wrong while signing up");
        }
    },
    async getPrivateKey(userId) {
        try {
            const { postgres } = await connectAll();

            const result = await postgres.query('SELECT * FROM private_keys WHERE "userId" = $1', [userId]);


            if (result.rows.length > 0) {
                return result.rows[0];
            } else {
                return null;
            }
        } catch (e) {
            console.log(e);
        }
    },

    async userExists(email) {
        const { postgres } = await connectAll();
        const result = await postgres.query(
            `SELECT EXISTS (
            SELECT 1 FROM users WHERE email = $1 AND "isVerified"=TRUE
             ) AS "exists"`,
            [email]
        );

        return result.rows[0].exists;
    },

    async login(email) {
        const { postgres } = await connectAll();

        const result = await postgres.query('SELECT * FROM users WHERE email = $1 AND "isVerified"=TRUE AND "isGoogleSignIn"=FALSE', [email]);

        if (result.rows.length > 0) {
            return result.rows[0];
        } else {
            return null;
        }

    },

    async ContinueWithGoogle(email) {
        try {
            const { postgres } = await connectAll();

            // Step 1: Get the verified user by email
            const selectResult = await postgres.query(`
            SELECT * FROM users
            WHERE email = $1 AND "isVerified" = TRUE
             `, [email]);

            if (selectResult.rows.length === 0) {
                return null; // No verified user found
            }

            const user = selectResult.rows[0];

            // Step 2: If user is not yet using Google sign-in, update it
            if (!user.isGoogleSignIn) {
                const updatedResult = await postgres.query(`
                UPDATE users
                SET "isGoogleSignIn" = TRUE, password = $1
                WHERE id = $2
                RETURNING *
            `, ['GoogleSignUp', user.id]);

                return updatedResult.rows[0];
            }

            // Step 3: Already using Google sign-in, return original user
            return user;

        } catch (error) {
            console.error('Error in ContinueWithGoogle:', error);
            throw new Error('Something went wrong while continuing with Google.');
        }
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


    async deleteAndGetVerifiedUser(id, email, privateKey, publicKey) {
        const { postgres } = await connectAll();
        const client = await postgres.connect();

        try {
            await client.query('BEGIN');


            await client.query(
                `UPDATE users SET "isVerified"=$1, public_key=$2 WHERE id=$3`,
                [true, publicKey, id]
            );

            // Delete unverified entry
            await client.query(
                `DELETE FROM users WHERE email = $1 AND "isVerified" = false`,
                [email]
            );

            await client.query(`DELETE FROM "OTP" WHERE email = $1`,
                [email]);


            await client.query(
                `INSERT INTO private_keys ("userId", private_key)
                VALUES ($1, $2)
                RETURNING *`,
                [id, privateKey]
            );

            // Get the verified one
            const result = await client.query(
                `SELECT * FROM users WHERE id=$1`,
                [id]
            );

            await client.query('COMMIT');
            return result.rows[0];

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Transaction error:', err);
            throw err;
        } finally {
            client.release();
        }
    },

    async updatePasswordAndClearOTP(userId, email, password) {
        const { postgres } = await connectAll();
        const client = await postgres.connect();

        try {

            await client.query('BEGIN');
            await client.query(
                `UPDATE users SET password=$1 WHERE id = $2`,
                [password, userId]
            );
            await client.query(`DELETE FROM "OTP" WHERE email = $1`,
                [email])

            const result = await client.query(
                `SELECT * FROM users WHERE id=$1`,
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


    async CompleteSignUpWithGoogle(user, publicKey, privateKey) {
        const { postgres } = await connectAll();
        const client = await postgres.connect();
        const joinDate = new Date().toISOString().split('T')[0];
        try {
            await client.query('BEGIN');

            const result = await postgres.query(
                `INSERT INTO users 
                (email, password, "userName", country, gender, "isVerified",about,"joinDate","isGoogleSignIn",public_key)
                VALUES 
                ($1, $2, $3, $4, $5, $6,$7,$8,$9,$10)
                RETURNING *`,
                [user.email, user.password, user.userName, user.country, user.gender, true, "ohhhhh! I am cool and mysterious", joinDate, true, publicKey]
            );

            await client.query(`DELETE FROM users WHERE email = $1 AND "isVerified"=$2`,
                [user.email, false]);

            await client.query(
                `INSERT INTO private_keys ("userId", private_key)
                VALUES ($1, $2)
                RETURNING *`,
                [result.rows[0].id, privateKey]
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


    async updateAvatarId(userId, avatarId) {
        try {
            const { postgres } = await connectAll();

            const user = await postgres.query(`UPDATE users SET "avatarId"=$1
             WHERE id=$2
             RETURNING *`, [avatarId, userId]);
            return user.rows[0];
        } catch (e) {
            throw Error(e);
        }
    },


    async updateAboutSection(userId, about) {
        try {
            const { postgres } = await connectAll();
            const user = await postgres.query(`UPDATE users SET "about"=$1
             WHERE id=$2
             RETURNING *`, [about, userId]);
            return user.rows[0];
        } catch (e) {
            throw new Error(e);
        }
    },

    async getUserViaId(userId) {
        try {
            const { postgres } = await connectAll();
            const result = await postgres.query(`SELECT * FROM users WHERE id=$1`, [userId]);
            const user = result.rows[0];
            return user;

        } catch (e) {
            throw e;
        }
    },

    async deletePrefrence(userId) {
        try {
            const { postgres } = await connectAll();
            const query = 'DELETE FROM users_history WHERE user_id= $1 RETURNING *';
            const values = [userId];
            const result = await postgres.query(query, values);

            if (result.rowCount > 0) {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            console.error(err);
        }
    }



}


module.exports = UserModel;
