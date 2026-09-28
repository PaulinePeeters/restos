import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import ListeLivraisons from './ListeLivraisons';
import Messagerie from './Messagerie';
import MonCompte from '../components/common/MonCompte';
import PointageView from '../pages/PointageView';
import { Notifications } from '../components/common/Notifications';
import Sidebar from '../components/layout/Sidebar';
import layoutStyles from '../components/layout/DashboardLayout.module.css';

interface SidebarLink {
    to: string;
    label: string;
    badge?: number;
}

function LivreurDashboard() {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;
        socket.emit('join_room', 'livreur');
    }, [socket]);

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const data: any = await api.get('/notifications?role=livreur');
                if (data && Array.isArray(data)) {
                    setUnreadCount(data.length);
                }
            } catch (err) { console.error(err); }
        };

        fetchNotifs();
        const interval = setInterval(fetchNotifs, 10000);

        const handleRead = () => setUnreadCount(prev => Math.max(0, prev - 1));
        window.addEventListener('notification_read', handleRead);

        return () => {
            clearInterval(interval);
            window.removeEventListener('notification_read', handleRead);
        };
    }, []);

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
        { to: '/livreur/livraisons', label: 'Livraisons' },
        {
            to: '/livreur/notifications',
            label: 'Notifications',
            badge: unreadCount
        },
        { to: '/livreur/messagerie', label: 'Messagerie' },
        { to: '/livreur/moncompte', label: 'Mon Compte' },
        { to: '/livreur/pointage', label: 'Pointage' },
    ];

    return (
        <div className={layoutStyles.dashboardContainer}>
            <Sidebar
                title="Livreur"
                links={sidebarLinks}
                onLogout={handleLogout}
            />

            <main className={layoutStyles.content}>
                <Routes>
                    <Route index element={<Navigate to="livraisons" replace />} />
                    <Route path="livraisons" element={<ListeLivraisons />} />
                    <Route path="notifications" element={<Notifications role="livreur" />} />
                    <Route path="messagerie" element={<Messagerie />} />
                    <Route path="moncompte" element={<MonCompte role="livreur" />} />
                    <Route path="pointage" element={<PointageView />} />
                </Routes>
            </main>
        </div>
    );
}

export default LivreurDashboard;
