const connectAll = require('../Utilities/cloud/ConnectionToCloudResources');

const reportModel = {
    async addReport(reporterUserId, isPostReport, isCommentReport, isUserReport, postId, commentId, reportedUserId,
        reportContent, reportTime) {
        const { postgres } = await connectAll();

        const query = `
        INSERT INTO report (
            reporter_user_id,
            is_post_report,
            is_comment_report,
            is_user_report,
            post_id,
            comment_id,
            user_id,
            report_content,
            report_time,
            report_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9, 'pending')
        RETURNING *;
    `;

        const values = [
            reporterUserId,
            isPostReport,
            isCommentReport,
            isUserReport,
            postId,
            commentId,
            reportedUserId,
            reportContent,
            reportTime,
        ];

        try {
            const result = await postgres.query(query, values);
            return result.rows[0];
        } catch (err) {
            console.error("Error creating report:", err);
            throw err;
        }
    },

    async getReportsByReporter(reporterUserId) {
        const { postgres } = await connectAll();

        const query = `
        SELECT *
        FROM report
        WHERE reporter_user_id = $1
        ORDER BY report_time DESC;
    `;

        try {
            const result = await postgres.query(query, [reporterUserId]);
            return result.rows;   // returns array of reports
        } catch (err) {
            console.error('Error fetching reports:', err);
            throw err;
        }
    },
    async getUserReports(page = 1, limit = 20) {
        try {
            const { postgres } = await connectAll();

            const offset = (page - 1) * limit;

            const query = `
            SELECT 
                r.report_id,
                r.report_content,
                r.report_time,
                r.report_status,
                r.admin_feedback,
                ru."userName" AS reporter_username,
                ru.email AS reporter_email,
                ru.id AS reporter_user_id,
                tu."userName" AS reported_username,
                tu."avatarId" AS "avatarId",
                tu.email AS reported_email,
                tu.id AS reported_user_id,
                tu.aura AS reported_aura,
                tu."joinDate" AS reported_join_date

            FROM report r

            INNER JOIN users ru
                ON r.reporter_user_id = ru.id

            INNER JOIN users tu
                ON r.user_id = tu.id

            WHERE r.is_user_report = true AND r.report_status='pending'

            ORDER BY r.report_time DESC
            LIMIT $1 OFFSET $2;
        `;

            const values = [limit, offset];

            const result = await postgres.query(query, values);
            return result.rows;

        } catch (e) {
            console.log("Error fetching user reports:", e);
            throw e;
        }
    },
    async updateReportStatus(reportId, status, feedback) {
        const { postgres } = await connectAll();

        const query = `
        UPDATE report
        SET report_status = $1,
        admin_feedback=$3
        WHERE report_id = $2
    `;

        const values = [status, reportId, feedback];

        try {
            const result = await postgres.query(query, values);

            if (result.rowCount > 0) {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            console.error('Error updating ad status:', err);
            return false; // Optional: return false on DB error
        }
    }



}


module.exports = reportModel;