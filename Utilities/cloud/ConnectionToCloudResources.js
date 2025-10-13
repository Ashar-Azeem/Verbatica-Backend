const mongoose = require('mongoose');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;

let isConnected = false;
let pgPoolInstance = null;

async function connectAll() {
  if (isConnected) {
    // Already connected, return existing instances
    return {
      postgres: pgPoolInstance,
    };
  }

  try {
    // 1. Connect to MongoDB Atlas (only if not connected)
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB Atlas');
    }

    // 2. Connect to Neon PostgreSQL
    pgPoolInstance = new Pool({
      connectionString: process.env.POSTGRES_URI,
      ssl: { rejectUnauthorized: false }, // required by Neon
    });

    // Test PostgreSQL connection
    await pgPoolInstance.query('SELECT 1');
    console.log('✅ Connected to Neon PostgreSQL');

    // 3. Configure Cloudinary once
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('✅ Cloudinary configured');

    isConnected = true;

    return {
      mongo: mongoose,
      postgres: pgPoolInstance,
      cloudinary,
    };
  } catch (error) {
    console.error('❌ Error connecting:', error.message);
    throw error;
  }
}

module.exports = connectAll;
