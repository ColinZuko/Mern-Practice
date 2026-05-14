require('dotenv').config();
const connect = require('./connect');
const express = require('express');
const cors = require('cors');
const posts = require('./postRoutes');
const users = require('./userRoutes');
const awsRoutes= require('./awsRoutes');
const multer = require('multer');
const upload = multer();

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(upload.any());
app.use(posts);
app.use(users);
app.use(awsRoutes);


app.listen(PORT, '0.0.0.0', () => {
    connect.connectToServer();
    console.log(`Server is running on port: ${PORT}`);
});
