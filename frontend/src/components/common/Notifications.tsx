import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import styles from './Notifications.module.css';

import { tnotification } from '../../types/prisma-types';

interface NotificationsProps {
    role: string;
}

interface Notification extends Omit<tnotification, 'date_creation'> {
    date_creation: string | Date;
    [key: string]: any;
}

export function Notifications({ role }: NotificationsProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const fetchNotifs = async () => {
        try {
            const data: any = await api.get(`/notifications?role=${role}`);
            if (data) {
                setNotifications(data);
            }
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 10000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role]);

    const markAsRead = async (id: number) => {
        try {
            await api.put(`/notifications/${id}/read`, {});
            setNotifications(prev => prev.filter(n => n.id !== id));
            window.dispatchEvent(new Event('notification_read'));
        } catch (err) { console.error(err); }
    };

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Notifications</h2>
                <p className="page-subtitle">Consultez vos alertes et mises à jour.</p>
            </div>
            {notifications.length === 0 ? <p>Aucune nouvelle notification.</p> : (
                <ul className={styles.list}>
                    {notifications.map(n => (
                        <li key={n.id} className={styles.card}>
                            <div>
                                <strong className={n.type === 'STOCK' ? styles.typeStock : styles.typeDefault}>[{n.type}]</strong> {n.message}
                                <div className={styles.date}>
                                    {new Date(n.date_creation).toLocaleString()}
                                </div>
                            </div>
                            <button onClick={() => markAsRead(n.id)} className={styles.buttonRead}>
                                Lu
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
