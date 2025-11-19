const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema(
    {
        postId: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: ['non_polarized', 'polarized'],
            required: true,
        },
        summaries: [
            {
                narrative: {
                    type: String,
                    required: false,
                },
                summary: {
                    type: String,

                },
                commentCount: {
                    type: Number,
                    default: 0,
                },

            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Summary', summarySchema);
