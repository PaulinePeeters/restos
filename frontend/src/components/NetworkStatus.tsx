import React, { useEffect, useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { FaExclamationTriangle, FaSync } from 'react-icons/fa';
import { getQueue } from '../services/offlineStorage';
import styles from './NetworkStatus.module.css';
// status de connexion - en haut de l'application
const NetworkStatus: React.FC = () => {
    const { isOnline } = useNetwork();
    const [queueLength, setQueueLength] = useState<number>(0);

    useEffect(() => {
        const checkQueue = () => {
            const queue = getQueue();
            setQueueLength(queue.length);
        };

        checkQueue();
        const interval = setInterval(checkQueue, 2000);
        return () => clearInterval(interval);
    }, [isOnline]);

    if (isOnline && queueLength === 0) return null; // si connecté et pas d'actions en attente => pas de bandeau

    return (
        <div className={`${styles.networkStatusContainer} ${isOnline ? styles.syncing : styles.offline}`}>
            {isOnline ? (
                <>
                    <FaSync className={styles.spinAnimation} />
                    <span>Synchro serveur ({queueLength})...</span>
                </>
            ) : (
                <>
                    <FaExclamationTriangle />
                    <span>Mode Hors-Ligne ({queueLength} actions bloquées)</span>
                </>
            )}
        </div>
    );
};

export default NetworkStatus;
