import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import BACKEND_URL from '../config';
// Context pour gérer la connexion WebSocket
const SocketContext = createContext<Socket | null>(null);

export const useSocket = (): Socket | null => {
    return useContext(SocketContext);
};

interface SocketProviderProps {
    children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        const newSocket = io(BACKEND_URL); // connexion au serveur WebSocket
        setSocket(newSocket); // on stocke le socket dans le context

        return () => {
            newSocket.close(); // on ferme la connexion WebSocket quand le composant est démonté
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
