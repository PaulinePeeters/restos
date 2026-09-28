import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import EcranBar from './EcranBar';
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

function BarDashboard() {
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;
        socket.emit('join_room', 'barman');
    }, [socket]);

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const data: any = await api.get('/notifications?role=barman');
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
        { to: '/bar/preparation', label: 'Bar' },
        { to: '/bar/stock', label: 'Stock' },
        {
            to: '/bar/notifications',
            label: 'Notifications',
            badge: unreadCount
        },
        { to: '/bar/messagerie', label: 'Messagerie' },
        { to: '/bar/moncompte', label: 'Mon Compte' },
        { to: '/bar/pointage', label: 'Pointage' },
    ];

    return (
        <div className={layoutStyles.dashboardContainer}>
            <Sidebar
                title="Bar"
                links={sidebarLinks}
                onLogout={handleLogout}
            />

            <main className={layoutStyles.content}>
                <Routes>
                    <Route index element={<Navigate to="preparation" replace />} />
                    <Route path="preparation" element={<EcranBar />} />
                    <Route path="stock" element={<Stocks />} />
                    <Route path="notifications" element={<Notifications role="barman" />} />
                    <Route path="messagerie" element={<Messagerie />} />
                    <Route path="moncompte" element={<MonCompte role="bar" />} />
                    <Route path="pointage" element={<PointageView />} />
                </Routes>
            </main>
        </div>
    );
}

export default BarDashboard;
