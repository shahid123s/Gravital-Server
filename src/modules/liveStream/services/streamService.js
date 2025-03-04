const mediasoup = require('mediasoup');
const config = require('../../../config/mediasoupConfig');

class MediasoupService {
  constructor() {
    this.workers = [];
    this.nextWorkerIndex = 0;
    this.rooms = new Map();
  }

  async init() {
    // Create mediasoup workers
    for (let i = 0; i < config.worker.numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: config.worker.logLevel,
        logTags: config.worker.logTags,
        rtcMinPort: config.worker.rtcMinPort,
        rtcMaxPort: config.worker.rtcMaxPort
      });

      worker.on('died', () => {
        console.error(`mediasoup worker died, exiting: ${worker.pid}`);
        process.exit(1);
      });

      this.workers.push(worker);
    }
  }

  getNextWorker() {
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  async createRoom(roomId) {
    const worker = this.getNextWorker();
    const router = await worker.createRouter({ mediaCodecs: config.router.mediaCodecs });
    this.rooms.set(roomId, { router, peers: new Map() });
    return router;
  }

  async createWebRtcTransport(router) {
    const transport = await router.createWebRtcTransport(config.webRtcTransport);

    transport.on('dtlsstatechange', dtlsState => {
      if (dtlsState === 'closed') {
        transport.close();
      }
    });

    transport.on('close', () => {
      console.log('transport closed');
    });

    return {
      transport,
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      }
    };
  }
}

module.exports = new MediasoupService();