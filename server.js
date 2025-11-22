require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require("cors");
const connectAll = require('./Utilities/cloud/ConnectionToCloudResources');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const postRoute = require('./routes/post');
const newsRoute = require('./routes/news');
const adsRoute = require('./routes/ad');
const summaryModel = require('./routes/summary');
const businessOwnerRoute = require('./routes/business_owner');
const chatRoute = require('./routes/chat');
const messageRoute = require('./routes/message');
const reportRoute = require('./routes/report');
const notificationRoute = require('./routes/notification');
const adminRoute = require('./routes/admin');
const commentRoute = require('./routes/comment');
const newsCronJob = require('./jobs/fetchNews.js');
const { initElasticsearch } = require('./services/Elastic_Search/init');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


const io = new Server(server, {
  pingInterval: 20000,
  pingTimeout: 25000,
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});


//Keeps track of all the online user 
let onlineUsers = new Map();


io.on("connection", (socket) => {

  socket.on("join_user", (userId) => {
    if (!userId) {
      console.log("join_user event received without userId");
      return;
    }
    socket.userId = userId;

    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    io.emit("online_users", Array.from(onlineUsers.keys()));

    console.log(`User with ID ${userId} joined their personal room`);
  });

  socket.on("leave_user", (userId) => {
    socket.leave(userId);
    onlineUsers.delete(userId);
    io.emit("online_users", Array.from(onlineUsers.keys()));

    console.log(`User with ID ${userId} left their room`);
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("online_users", Array.from(onlineUsers.keys()));
      console.log(`User ${socket.userId} disconnected`);
    }
  });
});


app.set("io", io);

// Middleware
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/post', postRoute);
app.use('/api/news', newsRoute);
app.use('/api/chat', chatRoute);
app.use('/api/message', messageRoute);
app.use('/api/ads', adsRoute);
app.use('/api/summary', summaryModel);
app.use('/api/businessOwner', businessOwnerRoute);
app.use('/api/notification', notificationRoute);
app.use('/api/comment', commentRoute);
app.use('/api/report', reportRoute);
app.use('/api/admin', adminRoute);

app.use((err, req, res, next) => {
  console.error("🔥 Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

//  Start server function
const startServer = async () => {
  await connectAll();
  await initElasticsearch();
  // newsCronJob.start();
  newsCronJob.stop();

  const PORT = process.env.Port || 4000;

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
