import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { FaBell } from 'react-icons/fa';
import { useSocket } from '../context/SocketContext';

import Commandes from './commandes/Commandes';
import Reservations from './reservations/Reservations';
import MenuGestion from './menu/MenuGestion';
import Personnel from './personnel/Personnel';
import Stocks from './stocks/Stocks';
import Statistiques from './stats/Statistiques';
import Configuration from './config/Configuration';
import FideliteGestion from './fidelite/FideliteGestion';
import ChequesGestion from './fidelite/ChequesGestion';
import Caisse from './caisse/Caisse';
import Clients from './clients/Clients';
import Messagerie from './Messagerie';
import PointageView from '../pages/PointageView';
import MonCompte from '../components/common/MonCompte';

import Sidebar from '../components/layout/Sidebar';
import styles from './ManagerDashboard.module.css';
import layoutStyles from '../components/layout/DashboardLayout.module.css';

import { tnotification } from '../types/prisma-types';
import { useLanguage } from '../context/LanguageContext';

interface Notification extends Omit<tnotification, 'data'> {
    data?: {
        plats?: Array<{ id: number | string }>;
        [key: string]: any;
    } | null;
    [key: string]: any;
}

interface SidebarLink {
    to: string;
    label: string;
}

const ManagerDashboard: React.FC = () => {
    const { t } = useLanguage();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const navigate = useNavigate();
    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;
        socket.emit('join_room', 'manager');
        console.log('[SOCKET] Joining manager room');
    }, [socket]);

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const data: any = await api.get('/notifications?role=manager');
                if (data) {
                    setNotifications(data);
                }
            } catch (err) { console.error(err); }
        };

        fetchNotifs();
        const interval = setInterval(fetchNotifs, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkRead = async (id: number) => {
        try {
            await api.put(`/notifications/${id}/read`, {});
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) { console.error(err); }
    };

    const handleAction = async (notif: Notification, action: string) => {
        if (action === 'desactiver') {
            // Désactiver les plats impactés
            if (notif.data && notif.data.plats) {
                let allSuccess = true;
                for (const plat of notif.data.plats) {
                    try {
                        const res = await api.put(`/plats/${plat.id}`, { disponible: false });
                        if (!res) allSuccess = false;
                    } catch (err) {
                        console.error(err);
                        allSuccess = false;
                    }
                }
                if (allSuccess) {
                    toast.success(t('toast.dashboard.dishes_disabled'));
                } else {
                    toast.error(t('toast.dashboard.dishes_disable_error'));
                }
                handleMarkRead(notif.id);
            }
        } else if (action === 'modifier') {
            navigate('/manager/menu');
            setShowNotifPanel(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('staffToken');
        sessionStorage.removeItem('staffUser');
        sessionStorage.removeItem('activeStaffId');
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffUser');
        localStorage.removeItem('activeStaffId');
        navigate('/login-staff');
    };

    const sidebarLinks: SidebarLink[] = [
        { to: '/manager/commandes', label: 'Commandes' },
        { to: '/manager/reservations', label: 'Réservations' },
        { to: '/manager/clients', label: 'Clients' },
        { to: '/manager/menu', label: 'Menu & Plats' },
        { to: '/manager/caisse', label: 'Caisse' },
        { to: '/manager/personnel', label: 'Personnel' },
        { to: '/manager/stocks', label: 'Stock' },
        { to: '/manager/statistiques', label: 'Statistiques' },
        { to: '/manager/fidelite', label: 'Fidélité & Offres' },
        { to: '/manager/cheques', label: 'Chèques Cadeaux' },
        { to: '/manager/messagerie', label: 'Messagerie' },
        { to: '/manager/configuration', label: 'Configuration' },
        { to: '/manager/mon-compte', label: 'Mon Compte' },
        { to: '/manager/pointage', label: 'Pointage' },      
    ];

    const headerContent = (
        <div className={styles.headerBellContainer} onClick={() => setShowNotifPanel(!showNotifPanel)}>
            <FaBell className={styles.bellIcon} />
            {notifications.length > 0 && (
                <span className={styles.notificationBadge}>
                    {notifications.length}
                </span>
            )}
            {showNotifPanel && (
                <div className={styles.notifPanel} onClick={(e) => e.stopPropagation()}>
                    <h4 style={{ color: '#333' }}>Notifications</h4>
                    {notifications.length === 0 ? <p style={{ color: '#666' }}>Aucune alerte.</p> : (
                        <ul className={styles.notificationList}>
                            {notifications.map(n => (
                                <li key={n.id} className={styles.notificationItem}>
                                    <p className={styles.notificationMessage} style={{ color: '#333' }}>{n.message}</p>
                                    {n.type === 'STOCK' && (
                                        <div className={styles.actionButtons}>
                                            <button onClick={() => handleAction(n, 'desactiver')} className={styles.btnActionDisable}>
                                                Désactiver Plats
                                            </button>
                                            <button onClick={() => handleAction(n, 'modifier')} className={styles.btnActionModify}>
                                                Modifier
                                            </button>
                                        </div>
                                    )}
                                    <button onClick={() => handleMarkRead(n.id)} className={styles.btnMarkRead}>
                                        Marquer comme lu
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );

    const footerContent = (
        <div className={styles.quickAccess}>
            <h4 className={styles.quickAccessTitle}>Accès Rapide</h4>
            <ul className={styles.quickAccessList}>
                <li>
                    <Link to="/serveur" className={styles.quickAccessLink} title="Ouvrir la vue Serveur">
                        <small>Serveur</small>
                    </Link>
                </li>
                <li>
                    <Link to="/cuisine" className={styles.quickAccessLink} title="Ouvrir la vue Cuisine">
                        <small>Cuisine</small>
                    </Link>
                </li>
                <li>
                    <Link to="/livreur" className={styles.quickAccessLink} title="Ouvrir la vue Livreur">
                        <small>Livreur</small>
                    </Link>
                </li>
                <li>
                    <Link to="/bar" className={styles.quickAccessLink} title="Ouvrir la vue Bar">
                        <small>Bar</small>
                    </Link>
                </li>
            </ul>
        </div>
    );

    return (
        <div className={layoutStyles.dashboardContainer}>
            <Sidebar
                title="Manager"
                links={sidebarLinks}
                headerContent={headerContent}
                footerContent={footerContent}
                onLogout={handleLogout}
            />

            <main className={layoutStyles.content}>
                <Routes>
                    <Route index element={<Navigate to="commandes" replace />} />
                    <Route path="commandes" element={<Commandes />} />
                    <Route path="reservations" element={<Reservations clientId={null} />} />
                    <Route path="clients" element={<Clients />} />
                    <Route path="menu" element={<MenuGestion />} />
                    <Route path="personnel" element={<Personnel />} />
                    <Route path="stocks" element={<Stocks />} />
                    <Route path="statistiques" element={<Statistiques />} />
                    <Route path="fidelite" element={<FideliteGestion />} />
                    <Route path="cheques" element={<ChequesGestion />} />
                    <Route path="caisse" element={<Caisse />} />
                    <Route path="messagerie" element={<Messagerie />} />
                    <Route path="configuration" element={<Configuration />} />
                    <Route path="pointage" element={<PointageView />} />
                    <Route path="mon-compte" element={<MonCompte />} />
                </Routes>
            </main>
        </div>
    );
}

export default ManagerDashboard;
