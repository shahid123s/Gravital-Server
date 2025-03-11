const { Server } = require("socket.io");
const appConfig = require("./appConfig");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: appConfig.cors.origin, // Update with your frontend URL if needed
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const { username: currentUser } = socket.handshake.auth;
    console.log('User connected:', socket.id, currentUser);

    socket.on("createOnlineUser", ({username}) => {
      console.log(`Online user: ${username}`);
      socket.join(username);
    });

    socket.on('sendNotification', ({username, notification}) => {
      console.log(`Notification sent to ${username}:`, notification);
      io.to(username).emit('receiveNotification', notification);
    })

    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`User joined room: ${roomId}`);
    });

    socket.on("sendMessage", ({ roomId, message, username }) => {
      console.log(`Message sent to room ${roomId}:`, message);

      io.to(roomId).emit("receiveMessage", { 
        content: message, 
        username,
      });

      // ✅ Send to room
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};


const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

module.exports = { initializeSocket, getIo };