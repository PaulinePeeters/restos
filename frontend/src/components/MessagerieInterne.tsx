import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FaTrash } from 'react-icons/fa';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import styles from './MessagerieInterne.module.css';

import { tnotification } from '../types/prisma-types';

interface MessagerieInterneProps {
    role: string;
    senderName: string;
}

interface Notification extends Omit<tnotification, 'date_creation' | 'data'> {
    date_creation: string | Date;
    data?: {
        sender?: string;
    } | any;
    [key: string]: any;
}

const MessagerieInterne: React.FC<MessagerieInterneProps> = ({ role, senderName }) => {
    const { t } = useLanguage();
    const [message, setMessage] = useState<string>('');
    const [destinataire, setDestinataire] = useState<string>('manager');
    const [messagesRecus, setMessagesRecus] = useState<Notification[]>([]);
    const socket = useSocket();

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const data: any = await api.get(`/notifications?role=${role}`);
                if (data) {
                    setMessagesRecus(data.filter((n: Notification) => n.type === 'MESSAGE'));
                }
            } catch (err) { console.error(err); }
        };
        fetchMessages();
    }, [role]);
    //socket pour les notifications
    useEffect(() => {
        if (!socket) return;

        const handleNotification = (notif: any) => {
            if (notif.role_destinataire === role && notif.type === 'MESSAGE') {
                setMessagesRecus(prev => [notif, ...prev]);
                toast(t('toast.msg.new_received'), { icon: 'FaEnvelope' });
            }
        };

        socket.on('nouvelle_notification', handleNotification);

        return () => {
            socket.off('nouvelle_notification', handleNotification);
        };
    }, [socket, role]);

    const envoyer = async () => {
        if (!message.trim()) return;

        try {
            await api.post('/notifications', {
                type: 'MESSAGE',
                message: message,
                role: destinataire,
                data: { sender: senderName }
            });

            toast.success(t('toast.msg.sent', { recipient: destinataire }));
            setMessage('');
        } catch (err) {
            console.error(err);
            toast.error(t('toast.msg.error'));
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.put(`/notifications/${id}/read`, {});
            setMessagesRecus(prev => prev.filter(m => m.id !== id));
            toast.success(t('toast.msg.deleted'));
        } catch (err) { console.error(err); }
    };

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Messagerie Interne</h2>
                <p className="page-subtitle">Envoyez des messages aux différents postes du staff.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>Nouveau Message</h3>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Destinataire :</label>
                    <select
                        value={destinataire}
                        onChange={e => setDestinataire(e.target.value)}
                        className={styles.select}
                    >
                        <option value="manager">Manager</option>
                        <option value="cuisinier">Cuisine</option>
                        <option value="barman">Bar</option>
                        <option value="serveur">Serveurs</option>
                        <option value="livreur">Livreurs</option>
                        <option value="all" className={styles.broadcastOption}>TOUT LE STAFF</option>
                    </select>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Message :</label>
                    <textarea
                        rows={4}
                        placeholder="Écrivez votre message..."
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        className={styles.textarea}
                    />
                </div>

                <button
                    className={styles.sendButton}
                    onClick={envoyer}
                >
                    Envoyer
                </button>
            </div>

            <div className={styles.inboxCard}>
                <h3 className={styles.sectionTitle}>Boîte de réception</h3>
                {messagesRecus.length === 0 ? <p>Aucun message reçu.</p> : (
                    <ul className={styles.messageList}>
                        {messagesRecus.map(msg => (
                            <li key={msg.id} className={styles.messageItem}>
                                <div className={styles.messageContent}>
                                    <div className={styles.messageHeader}>
                                        <strong>De : {msg.data?.sender || 'Système'}</strong>
                                        <span className={styles.messageDate}>{new Date(msg.date_creation).toLocaleString()}</span>
                                    </div>
                                    <p className={styles.messageBody}>{msg.message}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(msg.id)}
                                    className={styles.deleteButton}
                                >
                                    <FaTrash />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default MessagerieInterne;