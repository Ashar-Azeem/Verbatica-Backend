const connectAll = require('../Utilities/cloud/ConnectionToCloudResources');
const searchSimilarPosts = require('../services/Elastic_Search/searchPosts');
const recommendPosts = require('../services/Elastic_Search/recommendPosts');
const createEmbeddings = require('../services/Elastic_Search/createEmbeddings');


const postModel = {
    async uploadAPost(title, description, image_link, video_link, is_debate, user_id, clusters, newsId) {
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
            news_id
        )
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12
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
                newsId
            ];

            const result = await postgres.query(query, values);
            return result.rows[0];

        } catch (e) {
            console.log(e);
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
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote
                FROM posts p
                JOIN users u ON p.user_id = u.id AND p.user_id = $1 AND p.post_id < $3
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2 
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
                    p.clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote
                FROM posts p
                JOIN users u ON p.user_id = u.id AND p.user_id = $1 
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2 
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

    async voteOnPost(postId, userId, newVote) {
        const { postgres } = await connectAll();
        const client = await postgres.connect();

        try {
            await client.query("BEGIN");

            // Lock both post row and (if exists) the user vote row
            const { rows: postRows } = await client.query(
                `SELECT post_id, total_upvotes, total_downvotes, user_id
             FROM posts
             WHERE post_id = $1
             FOR UPDATE`,
                [postId]
            );



            if (postRows.length === 0) {
                throw new Error("Post not found");
            }

            const { rows: voteRows } = await client.query(
                `SELECT value
             FROM post_votes
             WHERE post_id = $1 AND user_id = $2
             FOR UPDATE`,
                [postId, userId]
            );

            let totalUpChange = 0;
            let totalDownChange = 0;
            let auraChange = 0;

            if (voteRows.length === 0) {
                // No previous vote → insert
                await client.query(
                    `INSERT INTO post_votes (post_id, user_id, value)
                 VALUES ($1, $2, $3)`,
                    [postId, userId, newVote]
                );
                if (newVote) {
                    totalUpChange = 1;
                    auraChange = 1;
                } else {
                    totalDownChange = 1;
                    auraChange = -1;
                }
            } else {
                const oldVote = voteRows[0].value;

                if (oldVote === newVote) {
                    // Same vote → remove
                    await client.query(
                        `DELETE FROM post_votes
                     WHERE post_id = $1 AND user_id = $2`,
                        [postId, userId]
                    );
                    if (newVote) {
                        totalUpChange = -1;
                        auraChange = -1;
                    } else {
                        totalDownChange = -1;
                        auraChange = +1;
                    }
                } else {
                    // Different vote → update
                    await client.query(
                        `UPDATE post_votes
                     SET value = $3
                     WHERE post_id = $1 AND user_id = $2`,
                        [postId, userId, newVote]
                    );
                    if (newVote) {
                        totalUpChange = 1;
                        totalDownChange = -1;
                        auraChange = +2;
                    } else {
                        totalUpChange = -1;
                        totalDownChange = 1;
                        auraChange = -2;
                    }
                }
            }

            // Now safely update post counters
            await client.query(
                `UPDATE posts
             SET total_upvotes = total_upvotes + $1,
                 total_downvotes = total_downvotes + $2
             WHERE post_id = $3`,
                [totalUpChange, totalDownChange, postId]
            );

            await client.query(
                `UPDATE users
             SET aura= aura + $1
             WHERE id = $2`,
                [auraChange, postRows[0].user_id]
            )

            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            console.error("Vote update failed:", err);
            throw err;
        } finally {
            client.release();
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
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote
                FROM posts p
                JOIN users u ON p.user_id = u.id AND p.news_id =$1
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2 
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
                    p.clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote
                FROM posts p
                JOIN users_following uf ON p.user_id = uf.following_id AND uf.follower_id = $1 AND p.post_id < $2
                JOIN users u on p.user_id=u.id
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $1 
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
                    p.user_id,
                    p.clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote
                FROM posts p
                JOIN users_following uf ON p.user_id = uf.following_id AND uf.follower_id = $1 
                JOIN users u on p.user_id=u.id
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $1 
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
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote
                FROM posts p
                JOIN users u ON p.user_id = u.id AND p.post_id= ANY($1) AND p.user_id!=$2
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2 
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
                p.clusters,
                u."userName",
                u."avatarId",
                u.public_key,
                v.value AS user_vote,
                (
                    (p.total_click + (p.total_upvotes * 2))::float 
                    / GREATEST(EXTRACT(EPOCH FROM (NOW() - p.upload_date))/3600, 1)
                ) AS hot_score
            FROM posts p
            JOIN users u ON p.user_id = u.id AND p.user_id!=$2
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2  
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
            const recommendation = await searchSimilarPosts(embeddings, 0.8);
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
                    p.clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote
                FROM posts p
                JOIN users u ON p.user_id = u.id AND p.post_id= ANY($1) 
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2 
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
            const recommendation = await searchSimilarPosts(embeddings, 0.60);
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
                    p.clusters,
                    u."userName",
                    u."avatarId",
                    u.public_key,
                    v.value AS user_vote
                FROM posts p
                JOIN users u ON p.user_id = u.id AND p.post_id= ANY($1) 
                LEFT JOIN post_votes v 
                    ON v.post_id = p.post_id AND v.user_id = $2 
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
                p.clusters,
                u."userName",
                u."avatarId",
                u.public_key,
                v.value AS user_vote
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
        this.uploadTime = new Date(upload_date);
        this.clusters = clusters;
        this.isUpVote = user_vote === true;
        this.isDownVote = user_vote === false;
        this.public_key = public_key;
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
        };
    }
}

module.exports = postModel;
