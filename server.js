//The below statement gets the env variables and put them into process.env map
require('dotenv').config();
const express = require('express');
const cors = require("cors")
const connectAll = require('./Utilities/cloud/ConnectionToCloudResources');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const postRoute = require('./routes/post');
const newsRoute = require('./routes/news');
const adsRoute = require('./routes/ad');
const businessOwner = require('./routes/business_owner');
const newsCronJob = require('./jobs/fetchNews.js');
const { initElasticsearch } = require('./services/Elastic_Search/init');

const app = express();

//middleware for converting any upcoming request data into json from string form
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());

//setting up routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/post', postRoute);
app.use('/api/news', newsRoute);
app.use('/api/ads', adsRoute);
app.use('/api/businessOwner', businessOwner);

app.use((err, req, res, next) => {
  console.error("🔥 Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const startServer = async () => {
  await connectAll();
  await initElasticsearch();
  // newsCronJob.start();
  newsCronJob.stop();
  app.listen(process.env.Port, () => {
    console.log(`Server running on port ${process.env.Port}`);
  });
};

startServer();