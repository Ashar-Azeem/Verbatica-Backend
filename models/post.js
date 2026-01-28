const connectAll = require('../Utilities/cloud/ConnectionToCloudResources');
const searchSimilarPosts = require('../services/Elastic_Search/searchPosts');
const recommendPosts = require('../services/Elastic_Search/recommendPosts');
const createEmbeddings = require('../services/Elastic_Search/createEmbeddings');
const notificationModel = require('./notification');
const redis = require('../Utilities/cloud/Redis');

const postModel = {
    async uploadAPost(title, description, image_link, video_link, is_debate, user_id, clusters, newsId, is_automated_clusters) {
        try {
            const { postgres } = await connectAll();
            const query = `
        INSERT INTO posts (
            title,
            description,
            image_link,
            video_link,
            is_debate,
            total_upvotes,
            total_downvotes,
            total_comments,
            upload_date,
            user_id,
            clusters,
            news_id,
            is_automated_clusters
        )
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13
        )
        RETURNING *;
    `;

            const values = [
                title,
                description,
                image_link,
                video_link,
                is_debate,
                0,
                0,
                0,
                new Date(),
                user_id,
                clusters,
                newsId,
                is_automated_clusters
            ];

            const result = await postgres.query(query, values);
            return result.rows[0];

        } catch (e) {
            console.log(e);
        }
    },
    async deletePost(postId) {
        try {
            const { postgres } = await connectAll();


            const result = await postgres.query(
                `DELETE FROM posts
            WHERE post_id=$1`,
                [postId]
            );
            return { status: result.rowCount > 0 ? true : false };


        } catch (e) {
            throw new Error(e);
        }
    },
    async getPostWithId(postId, userId) {
        try {
            const { postgres } = await connectAll();


            const result = await postgres.query(
                `SELECT 
                    p.post_id,    
                    p.title,
                    p.description,
                    p.image_link,
                    p.video_link,
                    p.is_debate,
                    p.total_upvotes,
                    p.total_downvotes,
                    p.total_comments,
                    p.upload_date,
                    p.user_id,
                    p.clusters,
                    p.is_automated_clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote,
                    (s.post_id IS NOT NULL) AS is_saved
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2 
                LEFT JOIN saved_posts s
                    ON s.post_id=p.post_id AND s.user_id=$2
                WHERE p.post_id=$1
                `,
                [postId, userId]
            );
            return new Post(result.rows[0]);


        } catch (e) {
            throw new Error(e);
        }
    },

    async getPosts(ownerUserId, visitingUserId, key) {
        try {
            const { postgres } = await connectAll();

            const query = key ? `
                SELECT 
                    p.post_id,    
                    p.title,
                    p.description,
                    p.image_link,
                    p.video_link,
                    p.is_debate,
                    p.total_upvotes,
                    p.total_downvotes,
                    p.total_comments,
                    p.upload_date,
                    p.user_id,
                    p.clusters,
                    p.is_automated_clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote,
                    (s.post_id IS NOT NULL) AS is_saved

                FROM posts p
                JOIN users u ON p.user_id = u.id AND p.user_id = $1 AND p.post_id < $3
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2 
                LEFT JOIN saved_posts s
                    ON s.post_id=p.post_id AND s.user_id=$2
                ORDER BY p.upload_date DESC
                LIMIT 10
                `: `
                SELECT 
                    p.post_id,    
                    p.title,
                    p.description,
                    p.image_link,
                    p.video_link,
                    p.is_debate,
                    p.total_upvotes,
                    p.total_downvotes,
                    p.total_comments,
                    p.upload_date,
                    p.user_id,
                    p.is_automated_clusters,
                    p.clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote,
                    (s.post_id IS NOT NULL) AS is_saved

                FROM posts p
                JOIN users u ON p.user_id = u.id AND p.user_id = $1 
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2 
                LEFT JOIN saved_posts s
                    ON s.post_id=p.post_id AND s.user_id=$2
                ORDER BY p.upload_date DESC
                LIMIT 10
                `;

            const { rows } = await postgres.query(query,
                key ? [visitingUserId, ownerUserId, key] : [visitingUserId, ownerUserId]
            );

            if (rows.length == 0) {
                return [];
            }

            return rows.map(row => new Post({
                ...row,

            }));
        } catch (e) {
            console.log(e);
        }
    },
    async updateCommentCountInPost(postId) {
        try {
            const { postgres } = await connectAll();
            await postgres.query(`UPDATE posts SET total_comments=total_comments+1
            WHERE post_id=$1`, [postId]);
        } catch (e) {
            throw new Error(e);
        }
    },
    async updateCluster(postId, newClusterValue) {
        try {
            const { postgres } = await connectAll();
            const result = await postgres.query(`
            UPDATE posts 
            SET clusters = clusters || ARRAY[$2]
            WHERE post_id = $1
        `, [postId, newClusterValue]);
            if (result.rowCount === 0) {
                console.warn(`Post ID ${postId} not found. No update performed.`);
            } else {
                console.log(`Successfully updated ${result.rowCount} row(s).`);
            }
        } catch (e) {
            throw new Error(e);
        }
    },
    async voteOnPost(postId, userId, newVote) {
        const { postgres } = await connectAll();

        const voteKey = `user_vote:${postId}:${userId}`;
        const bufferKey = `vote_buffer:${postId}`;
        const pendingUsersKey = `pending_votes_users:${postId}`;

        // 1. Check Redis (Syntax: .get)
        let oldVoteStr = await redis.get(voteKey);
        let oldVote;

        if (oldVoteStr === null) {
            const { rows } = await postgres.query(
                "SELECT value FROM post_votes WHERE post_id = $1 AND user_id = $2",
                [postId, userId]
            );
            oldVote = rows.length > 0 ? (rows[0].value ? 1 : 0) : null;

            if (oldVote !== null) {
                await redis.set(voteKey, oldVote.toString(), { EX: 86400 });
            }
        } else {
            oldVote = parseInt(oldVoteStr);
        }

        const currentVoteInt = newVote ? 1 : 0;
        let upDelta = 0, downDelta = 0, auraDelta = 0;

        // 2. YOUR ORIGINAL LOGIC (Restored exactly as written)
        if (oldVote === null) {
            await redis.set(voteKey, currentVoteInt.toString(), { EX: 86400 });
            if (newVote) { upDelta = 1; auraDelta = 1; }
            else { downDelta = 1; auraDelta = -1; }
        } else if (oldVote === currentVoteInt) {
            await redis.del(voteKey);
            if (newVote) { upDelta = -1; auraDelta = -1; }
            else { downDelta = -1; auraDelta = 1; }
        } else {
            await redis.set(voteKey, currentVoteInt.toString(), { EX: 86400 });
            if (newVote) { upDelta = 1; downDelta = -1; auraDelta = 2; }
            else { upDelta = -1; downDelta = 1; auraDelta = -2; }
        }

        // 3. Update Redis Buffers (Syntax: .multi and CamelCase)
        const pipeline = redis.multi();
        pipeline.hIncrBy(bufferKey, 'up', upDelta);
        pipeline.hIncrBy(bufferKey, 'down', downDelta);
        pipeline.hIncrBy(bufferKey, 'aura', auraDelta);
        pipeline.sAdd(pendingUsersKey, userId.toString());
        pipeline.sAdd('dirty_posts', postId.toString());
        await pipeline.exec();

        // 4. Threshold Trigger (Syntax: .hGetAll)
        const counts = await redis.hGetAll(bufferKey);
        const totalActivity = Math.abs(parseInt(counts.up || 0)) + Math.abs(parseInt(counts.down || 0));
        //Sync if total activity reaches threshold
        if (totalActivity >= 5) {
            this.syncVotesToPostgres(postId, userId).catch(console.error);
        }
    },

    async syncVotesToPostgres(postId, userId) {


        const bufferKey = `vote_buffer:${postId}`;
        const pendingUsersKey = `pending_votes_users:${postId}`;

        const [changes, userIds] = await Promise.all([
            redis.hGetAll(bufferKey),
            redis.sMembers(pendingUsersKey)
        ]);

        if (!userIds.length) return;

        // Syntax: .multi for batching
        const pipe = redis.multi();
        userIds.forEach(uId => pipe.get(`user_vote:${postId.toString()}:${uId.toString()}`));
        const redisValues = await pipe.exec();

        const upserts = [];
        const deletes = [];
        userIds.forEach((uId, i) => {
            const val = redisValues[i];
            if (val === null) deletes.push(uId);
            else upserts.push({ id: uId, val: val === '1' });
        });

        const { postgres } = await connectAll();

        try {
            await postgres.query("BEGIN");

            if (upserts.length > 0) {
                await postgres.query(`
                INSERT INTO post_votes (post_id, user_id, value, voting_date)
                SELECT $1, unnest($2::integer[]), unnest($3::boolean[]), NOW()
                ON CONFLICT (post_id, user_id) DO UPDATE SET value = EXCLUDED.value;
            `, [postId, upserts.map(u => u.id), upserts.map(u => u.val)]);
            }

            if (deletes.length > 0) {
                await postgres.query(`DELETE FROM post_votes WHERE post_id = $1 AND user_id = ANY($2)`, [postId, deletes]);
            }

            // YOUR ORIGINAL CTE QUERY (Kept exactly as requested)
            const postRes = await postgres.query(`
            WITH old_post AS (
                SELECT total_upvotes FROM posts WHERE post_id = $3
            )
            UPDATE posts SET 
                total_upvotes = total_upvotes + $1, 
                total_downvotes = total_downvotes + $2 
            WHERE post_id = $3 
            RETURNING (SELECT total_upvotes FROM old_post) AS old_upvotes, 
                        total_upvotes AS new_upvotes, title, user_id;
        `, [parseInt(changes.up || 0), parseInt(changes.down || 0), postId]);

            if (postRes.rows.length > 0) {
                await postgres.query(`UPDATE users SET aura = aura + $1 WHERE id = $2`,
                    [parseInt(changes.aura || 0), postRes.rows[0].user_id]);

                // Send the notification if new upvotes reach a multiple of 5
                if (postRes.rows[0].new_upvotes > 0 && postRes.rows[0].new_upvotes % 5 === 0 && postRes.rows[0].new_upvotes > postRes.rows[0].old_upvotes) {
                    await notificationModel.addNotification(postId, null, userId, postRes.rows[0].user_id, true, false,
                        true, false, "5 new upvotes", `Your post "${postRes.rows[0].title}" is gaining attention`);
                }
            }

            await postgres.query("COMMIT");

            await redis.del(bufferKey);
            await redis.del(pendingUsersKey.toString());
            await redis.sRem('dirty_posts', postId.toString());
            console.log('successfully synced votes to Postgres');
        } catch (e) {
            await postgres.query("ROLLBACK");
            console.error("Error syncing votes to Postgres:", e);
            throw e;
        }
    },

    async getPostsWithInNews(newsId, ownerId) {
        try {
            const { postgres } = await connectAll();

            const query = `
                SELECT 
                    p.post_id,    
                    p.title,
                    p.description,
                    p.image_link,
                    p.video_link,
                    p.is_debate,
                    p.total_upvotes,
                    p.total_downvotes,
                    p.total_comments,
                    p.upload_date,
                    p.user_id,
                    p.clusters,
                    p.is_automated_clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote,
                    (s.post_id IS NOT NULL) AS is_saved
                FROM posts p
                JOIN users u ON p.user_id = u.id AND p.news_id =$1
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2 
                LEFT JOIN saved_posts s
                    ON s.post_id=p.post_id AND s.user_id=$2
                ORDER BY p.upload_date DESC
                `;

            const { rows } = await postgres.query(query,
                [newsId, ownerId]
            );

            if (rows.length == 0) {
                return [];
            }

            return rows.map(row => new Post({
                ...row,

            }));
        } catch (e) {
            console.log(e);
        }
    },

    async getFollowingPosts(userId, cursor) {
        try {
            const { postgres } = await connectAll();

            const query = cursor ? `SELECT 
                    p.post_id,    
                    p.title,
                    p.description,
                    p.image_link,
                    p.video_link,
                    p.is_debate,
                    p.total_upvotes,
                    p.total_downvotes,
                    p.total_comments,
                    p.upload_date,
                    p.user_id,
                    p.is_automated_clusters,
                    p.clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote,
                    (s.post_id IS NOT NULL) AS is_saved
                FROM posts p
                JOIN users_following uf ON p.user_id = uf.following_id AND uf.follower_id = $1 AND p.post_id < $2
                JOIN users u on p.user_id=u.id
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $1 
                LEFT JOIN saved_posts s
                    ON s.post_id=p.post_id AND s.user_id=$1
                ORDER BY p.upload_date DESC
                LIMIT 10
                `: `SELECT 
                    p.post_id,    
                    p.title,
                    p.description,
                    p.image_link,
                    p.video_link,
                    p.is_debate,
                    p.total_upvotes,
                    p.total_downvotes,
                    p.total_comments,
                    p.upload_date,
                    p.is_automated_clusters,
                    p.user_id,
                    p.clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote,
                    (s.post_id IS NOT NULL) AS is_saved
                FROM posts p
                JOIN users_following uf ON p.user_id = uf.following_id AND uf.follower_id = $1 
                JOIN users u on p.user_id=u.id
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $1 
                LEFT JOIN saved_posts s
                    ON s.post_id=p.post_id AND s.user_id=$1
                ORDER BY p.upload_date DESC
                LIMIT 10`;

            const { rows } = await postgres.query(query,
                cursor ? [userId, cursor] : [userId]
            );

            if (rows.length == 0) {
                return [];
            }

            return rows.map(row => new Post({
                ...row,

            }));

        } catch (e) {

        }
    },

    async getHistoryPosts(userId) {
        try {
            const { postgres } = await connectAll();
            const query = `SELECT *
            FROM users_history WHERE user_id=$1
            ORDER BY watched_at DESC
            LIMIT 50`;
            const { rows } = await postgres.query(query, [userId]);
            if (rows.length == 0) {
                return [];
            }

            return rows;
        } catch (e) {
            console.log(e);
        }
    },
    async getForYouPosts(userId, history, lastPost, page, vector) {
        try {
            const { postgres } = await connectAll();
            const recommendation = await recommendPosts.recommendPosts(history, 10, page, lastPost, vector);
            let postIds = [];
            for (const post of recommendation.posts) {
                postIds.push(post.id);
            }
            const query = `SELECT 
                    p.post_id,    
                    p.title,
                    p.description,
                    p.image_link,
                    p.video_link,
                    p.is_debate,
                    p.total_upvotes,
                    p.total_downvotes,
                    p.total_comments,
                    p.upload_date,
                    p.user_id,
                    p.clusters,
                    p.is_automated_clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote,
                    (s.post_id IS NOT NULL) AS is_saved
                FROM posts p
                JOIN users u ON p.user_id = u.id AND p.post_id= ANY($1) AND p.user_id!=$2
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2
                LEFT JOIN saved_posts s
                    ON s.post_id=p.post_id AND s.user_id=$2
                ORDER BY array_position($1::int[], p.post_id)  
                LIMIT 10

                `;
            const { rows } = await postgres.query(query,
                [postIds, userId]
            );

            if (rows.length == 0) {
                return [];
            }
            return {
                vector: recommendation.vector, lastPost: recommendation.posts[recommendation.posts.length - 1], posts: rows.map(row => new Post({
                    ...row,
                }))
            };

        } catch (e) {
            console.log(e);
        }
    },
    async getTrendingPosts(pageNumber, userId) {
        try {
            const { postgres } = await connectAll();

            const query = `
            SELECT 
                p.post_id,    
                p.title,
                p.description,
                p.image_link,
                p.video_link,
                p.is_debate,
                p.total_upvotes,
                p.total_downvotes,
                p.total_comments,
                p.upload_date,
                p.user_id,
                p.is_automated_clusters,
                p.clusters,
                u."userName",
                u."avatarId",
                u.public_key,
                v.value AS user_vote,
                (
                    (p.total_click + (p.total_upvotes * 2))::float 
                    / GREATEST(EXTRACT(EPOCH FROM (NOW() - p.upload_date))/3600, 1)
                ) AS hot_score,
                (s.post_id IS NOT NULL) AS is_saved
            FROM posts p
            JOIN users u ON p.user_id = u.id AND p.user_id!=$2
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2  
                LEFT JOIN saved_posts s
                    ON s.post_id=p.post_id AND s.user_id=$2
            ORDER BY hot_score DESC
            LIMIT 10 OFFSET (($1 - 1) * 10);
        `;

            const { rows } = await postgres.query(query, [pageNumber, userId]);

            if (rows.length === 0) {
                return [];
            }
            return rows.map(row => new Post({
                ...row,

            }));

        } catch (e) {
            console.error("Error fetching trending posts:", e);
            throw e;
        }
    },
    async registerView(userId, postId) {
        try {
            const { postgres } = await connectAll();
            const query = `
                    WITH ins AS (
                    INSERT INTO users_history (user_id, id, watched_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (user_id, id)
                    DO UPDATE SET watched_at = EXCLUDED.watched_at
                    RETURNING (xmax = 0) AS inserted
                    )
                    UPDATE posts
                    SET total_click = total_click + 1
                    WHERE post_id = $2
                    AND (SELECT inserted FROM ins);
                `;
            await postgres.query(query, [userId, postId]);

        } catch (e) {
            console.log(e);
            throw e;
        }
    },

    async getSimilarPosts(userId, title, description) {
        try {
            const { postgres } = await connectAll();
            const embeddings = await createEmbeddings([title + " " + description]);
            const recommendation = await searchSimilarPosts(embeddings, 0.75);
            let postIds = [];
            for (const post of recommendation) {
                postIds.push(post.id);
            }
            const query = `SELECT 
                    p.post_id,    
                    p.title,
                    p.description,
                    p.image_link,
                    p.video_link,
                    p.is_debate,
                    p.total_upvotes,
                    p.total_downvotes,
                    p.total_comments,
                    p.upload_date,
                    p.user_id,
                    p.is_automated_clusters,
                    p.clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote,
                    (s.post_id IS NOT NULL) AS is_saved

                FROM posts p
                JOIN users u ON p.user_id = u.id AND p.post_id= ANY($1) 
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2 
                LEFT JOIN saved_posts s
                    ON s.post_id=p.post_id AND s.user_id=$2
                ORDER BY array_position($1::int[], p.post_id)  
                LIMIT 10

                `;
            const { rows } = await postgres.query(query,
                [postIds, userId]
            );

            if (rows.length == 0) {
                return [];
            }
            return rows.map(row => new Post({
                ...row,
            }));


        } catch (e) {
            console.log(e);
        }
    },
    async getSearchedPosts(userId, postQuery) {
        try {
            const { postgres } = await connectAll();
            const embeddings = await createEmbeddings([postQuery]);
            const recommendation = await searchSimilarPosts(embeddings, 0.65);
            let postIds = [];
            for (const post of recommendation) {
                postIds.push(post.id);
            }
            const query = `SELECT 
                    p.post_id,    
                    p.title,
                    p.description,
                    p.image_link,
                    p.video_link,
                    p.is_debate,
                    p.total_upvotes,
                    p.total_downvotes,
                    p.total_comments,
                    p.upload_date,
                    p.user_id,
                    p.is_automated_clusters,
                    p.clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote,
                    (s.post_id IS NOT NULL) AS is_saved
                FROM posts p
                JOIN users u ON p.user_id = u.id AND p.post_id= ANY($1) 
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2 
                LEFT JOIN saved_posts s
                    ON s.post_id=p.post_id AND s.user_id=$2
                ORDER BY array_position($1::int[], p.post_id)  
                LIMIT 10

                `;
            const { rows } = await postgres.query(query,
                [postIds, userId]
            );

            if (rows.length == 0) {
                return [];
            }
            return rows.map(row => new Post({
                ...row,
            }))


        } catch (e) {
            console.log(e);
        }
    },
    async SavePosts(userId, postId, savedAt) {
        try {
            const { postgres } = await connectAll();

            const result = await postgres.query(
                `INSERT INTO saved_posts (user_id, post_id,saved_time)
                    VALUES ($1, $2,$3)
                    ON CONFLICT (user_id, post_id)
                    DO NOTHING
                    RETURNING 'post_saved' AS status`,
                [userId, postId, savedAt]
            );

            if (result.rows.length === 0) {
                return { status: 'already_saved' };
            }
            return result.rows[0];
        } catch (e) {
            console.log(e);
        }
    },

    async getSavedPosts(userId) {
        try {
            const { postgres } = await connectAll();

            const result = await postgres.query(
                `Select 
                p.post_id,    
                p.title,
                p.description,
                p.image_link,
                p.video_link,
                p.is_debate,
                p.total_upvotes,
                p.total_downvotes,
                p.total_comments,
                p.upload_date,
                p.user_id,
                p.is_automated_clusters,
                p.clusters,
                u."userName",
                u."avatarId",
                u.public_key,
                v.value AS user_vote,
                TRUE AS is_saved
                FROM saved_posts s
                JOIN posts p on p.post_id=s.post_id AND s.user_id=$1
                Join users u on p.user_id = u.id
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $1 
                ORDER BY s.saved_time DESC
                `,
                [userId]
            );

            if (result.rows.length == 0) {
                return [];
            }
            return result.rows.map(row => new Post({
                ...row,
            }));

        } catch (e) {
            console.log(e);
        }
    },
    async unsavePost(userId, postId) {
        try {
            const { postgres } = await connectAll();

            const result = await postgres.query(
                `DELETE FROM saved_posts
                 WHERE user_id = $1 AND post_id = $2`,
                [userId, postId]
            );

            return { status: result.rowCount > 0 ? true : false };
        } catch (e) {
            new Error(e);
        }
    }
}



class Post {
    constructor({
        post_id,
        title,
        description,
        image_link,
        video_link,
        is_debate,
        total_upvotes,
        total_downvotes,
        total_comments,
        upload_date,
        user_id,
        clusters,
        userName,
        avatarId,
        user_vote,
        public_key,
        is_saved,
        is_automated_clusters
    }) {
        this.id = post_id;
        this.name = userName;
        this.userId = user_id;
        this.avatar = avatarId;
        this.title = title;
        this.description = description;
        this.postImageLink = image_link;
        this.postVideoLink = video_link;
        this.isDebate = is_debate;
        this.upvotes = total_upvotes;
        this.downvotes = total_downvotes;
        this.comments = total_comments;
        this.isAutomatedClusters = is_automated_clusters;
        this.uploadTime = new Date(upload_date);
        this.clusters = clusters;
        this.isUpVote = user_vote === true;
        this.isDownVote = user_vote === false;
        this.public_key = public_key;
        this.isSaved = is_saved;
    }

    toJSON() {
        return {
            id: this.id.toString(),
            name: this.name,
            userId: this.userId,
            avatar: this.avatar,
            title: this.title,
            description: this.description,
            postImageLink: this.postImageLink,
            postVideoLink: this.postVideoLink,
            isDebate: this.isDebate,
            upvotes: this.upvotes,
            downvotes: this.downvotes,
            isUpVote: this.isUpVote,
            isDownVote: this.isDownVote,
            comments: this.comments,
            uploadTime: this.uploadTime.toISOString(),
            clusters: this.clusters,
            public_key: this.public_key,
            isSaved: this.isSaved,
            isAutomatedClusters: this.isAutomatedClusters
        };
    }
}

module.exports = postModel;
