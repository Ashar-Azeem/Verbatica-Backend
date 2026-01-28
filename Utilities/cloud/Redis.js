const { createClient } = require('redis');

const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: 10961
    }
});

client.on('error', err => console.log('Redis Client Error', err));


(async () => {
    try {
        await client.connect();
        console.log("✅ Connected to Cloud Redis");
    } catch (err) {
        console.error("❌ Redis Connection Failed:", err);
    }
})();

module.exports = client;

