const {Server} = require('socket.io');
const {origin} = require('./appConfig').cors

let io;

const initSocket = (server) => {
    io = new Server (server, {
        cors: {
            origin: origin,
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log('New Client Connected: ', socket.id);

        // When a user starts streaming
        socket.on("start-stream", (roomId) => {
            console.log(`User ${socket.id} started streaming in room: ${roomId}`);
            socket.join(roomId);
            socket.broadcast.to(roomId).emit("stream-started", { streamerId: socket.id });
        });

        // When a viewer wants to join
        socket.on("join-stream", (roomId) => {
            console.log(`Viewer ${socket.id} joined stream: ${roomId}`);
            socket.join(roomId);
        });

        // WebRTC Signaling: Handling Offer
        socket.on("offer", ({ offer, roomId }) => {
            console.log(`Sending offer to viewers in ${roomId}`);
            socket.broadcast.to(roomId).emit("offer", offer);
        });

        // WebRTC Signaling: Handling Answer
        socket.on("answer", ({ answer, roomId }) => {
            console.log(`Sending answer to streamer in ${roomId}`);
            socket.broadcast.to(roomId).emit("answer", answer);
        });

        // WebRTC Signaling: Handling ICE Candidates
        socket.on("ice-candidate", ({ candidate, roomId }) => {
            if (candidate) {
                console.log("Relaying ICE Candidate to room:", roomId, candidate);
                socket.to(roomId).emit("ice-candidate", { candidate });
            } else {
                console.warn("Received an invalid ICE candidate from client:", candidate);
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('Client disconnected', socket.id);
        });
    });
    return io;
    
}
const getIo = () => {
    if(!io){
        throw new Error ('Socket.io not initialized')
    }
    return io
}

module.exports = {
    initSocket,
    getIo,
}