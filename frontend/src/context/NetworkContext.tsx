import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import toast from 'react-hot-toast';

import { processQueue } from '../services/syncService';

// provider pour gérer la connexion internet
interface NetworkContextType {
    isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = (): NetworkContextType => {
    const context = useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
};

interface NetworkProviderProps {
    children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
    // hooks qui gère la connexion internet
    useEffect(() => {
        // quand la connexion est rétablie, on envoie les actions en attente
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Connexion rétablie ! Synchronisation en cours...', {
                id: 'network-status',
                duration: 4000,
                icon: '🟢'
            });
            processQueue();
        };
        // quand la connexion est perdue, on envoie les actions en attente
        const handleOffline = () => {
            setIsOnline(false);
            toast.error('Mode hors-ligne activé. Vos actions seront sauvegardées localement.', {
                id: 'network-status',
                duration: Infinity,
                icon: '🔴'
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <NetworkContext.Provider value={{ isOnline }}>
            {children}
        </NetworkContext.Provider>
    );
};
