import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import EcranPreparation from './EcranPreparation';
import { Notifications } from '../components/common/Notifications';
import Messagerie from './Messagerie';
import MonCompte from '../components/common/MonCompte';
import PointageView from '../pages/PointageView';
import Stocks from '../manager/stocks/Stocks';
import Sidebar from '../components/layout/Sidebar';
import layoutStyles from '../components/layout/DashboardLayout.module.css';

interface SidebarLink {
    to: string;
    label: string;
    badge?: number;
}

function CuisineDashboard() {
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const socket = useSocket();
    // quand le socket est connecté, on rejoint la room "cuisinier"
    useEffect(() => {
        if (!socket) return;
        socket.emit('join_room', 'cuisinier');
    }, [socket]);

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const data: any = await api.get('/notifications?role=cuisinier');
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
        { to: '/cuisine/preparation', label: 'Préparation' },
        { to: '/cuisine/stock', label: 'Stock' },
        {
            to: '/cuisine/notifications',
            label: 'Notifications',
            badge: unreadCount
        },
        { to: '/cuisine/messagerie', label: 'Messagerie' },
        { to: '/cuisine/moncompte', label: 'Mon Compte' },
        { to: '/cuisine/pointage', label: 'Pointage' },
    ];

    return (
        <div className={layoutStyles.dashboardContainer}>
            <Sidebar
                title="Cuisine"
                links={sidebarLinks}
                onLogout={handleLogout}
            />

            <main className={layoutStyles.content}>
                <Routes>
                    <Route index element={<Navigate to="preparation" replace />} />
                    <Route path="preparation" element={<EcranPreparation />} />
                    <Route path="stock" element={<Stocks />} />
                    <Route path="notifications" element={<Notifications role="cuisinier" />} />
                    <Route path="messagerie" element={<Messagerie />} />
                    <Route path="moncompte" element={<MonCompte role="cuisine" />} />
                    <Route path="pointage" element={<PointageView />} />
                </Routes>
            </main>
        </div>
    );
}

export default CuisineDashboard;
