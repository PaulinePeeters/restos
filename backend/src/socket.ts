import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ALLOWED_ORIGINS } from './utils/config.js';
import { logger } from './utils/logger.js';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production' ? ALLOWED_ORIGINS : "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket: Socket) => {
        logger.debug('Client connecté:', socket.id);

        socket.on('join_room', (room: string) => {
            socket.join(room);
            logger.debug(`Socket ${socket.id} a rejoint la room ${room}`);
        });

        socket.on('disconnect', () => {
            logger.debug('Client déconnecté:', socket.id);
        });
    });

    return io;
};

export const getIo = () => {
    if (!io) {
        throw new Error("Socket.io n'est pas initialisé !");
    }
    return io;
};
