const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://exam-proctor-lilac.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: ['https://exam-proctor-lilac.vercel.app', 'http://localhost:3000']
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/exam',    require('./routes/exam'));
app.use('/api/violations', require('./routes/violations'));
app.use('/api/proctor', require('./routes/proctor')); // ✅ NEW

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected'));
});

app.set('io', io);

setInterval(() => {
  require('https').get('https://exam-proctor-backend-nevz.onrender.com/ping');
}, 14 * 60 * 1000);

app.get('/ping', (req, res) => res.send('ok'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => console.error('MongoDB error:', err));