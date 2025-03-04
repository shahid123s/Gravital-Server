const mediasoupService = require('./streamService');

module.exports = (io) => {

  
  io.on('connection', async (socket) => {


    socket.on('createRoom', async (roomId, callback) => {
      try {
        console.log('varunnA')
        const router = await mediasoupService.createRoom(roomId);
        callback({ roomId });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('join', async ({ roomId, isPublisher }, callback) => {
      try {
        const room = mediasoupService.rooms.get(roomId);
        if (!room) {
          throw new Error('Room does not exist');
        }

        const { transport, params } = await mediasoupService.createWebRtcTransport(room.router);
        
        // Store transport data
        socket.transportId = transport.id;
        socket.roomId = roomId;
        
        if (isPublisher) {
          room.peers.set(socket.id, {
            socket,
            transports: [transport],
            producers: new Map(),
            consumers: new Map()
          });
        }

        callback({ params });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('connectTransport', async ({ dtlsParameters }, callback) => {
      try {
        const room = mediasoupService.rooms.get(socket.roomId);
        const transport = room.peers.get(socket.id).transports.find(t => t.id === socket.transportId);
        
        await transport.connect({ dtlsParameters });
        callback({ success: true });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('produce', async ({ kind, rtpParameters }, callback) => {
      try {
        const room = mediasoupService.rooms.get(socket.roomId);
        const peer = room.peers.get(socket.id);
        const transport = peer.transports.find(t => t.id === socket.transportId);
        
        const producer = await transport.produce({ kind, rtpParameters });
        peer.producers.set(producer.id, producer);

        // Notify all other peers in the room
        socket.to(socket.roomId).emit('newProducer', {
          producerId: producer.id,
          kind: producer.kind
        });

        callback({ id: producer.id });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('disconnect', () => {
      const room = mediasoupService.rooms.get(socket.roomId);
      if (room) {
        const peer = room.peers.get(socket.id);
        if (peer) {
          // Clean up peer's resources
          peer.producers.forEach(producer => producer.close());
          peer.consumers.forEach(consumer => consumer.close());
          peer.transports.forEach(transport => transport.close());
          room.peers.delete(socket.id);
        }
      }
    });
  });
};