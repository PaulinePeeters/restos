import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from '../services/api';
import TableView from './TableView';
import ScanQR from "./ScanQR";
import { Notifications } from '../components/common/Notifications';
import Messagerie from './Messagerie';
import MonCompte from '../components/common/MonCompte';
import PointageView from '../pages/PointageView';
import Sidebar from '../components/layout/Sidebar';
import layoutStyles from '../components/layout/DashboardLayout.module.css';

interface SidebarLink {
    to: string;
    label: string;
    badge?: number;
}

function ServeurDashboard() {
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const socket = useSocket();

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const data: any = await api.get('/notifications?role=serveur');
                if (data && Array.isArray(data)) {
                    setUnreadCount(data.length);
                }
            } catch (err) { console.error(err); }
        };

        fetchNotifs();

        const handleRead = () => setUnreadCount(prev => Math.max(0, prev - 1));
        window.addEventListener('notification_read', handleRead);

        return () => window.removeEventListener('notification_read', handleRead);
    }, []);

    useEffect(() => {
        if (!socket) return;

        const joinRoom = () => {
             console.log("Rejoindre la salle serveur...");
             socket.emit('join_room', 'serveur');
        };

        if (socket.connected) {
            joinRoom();
        }

        socket.on('connect', joinRoom);
        
        const handleNotification = (data: { message: string }) => {
            console.log("Notification reçue:", data);
            setUnreadCount(prev => prev + 1);
        };
        socket.on('statut_ligne_updated', (ligne: any) => {
            if (ligne.statut_service === 'PRET') {
                const msg = `Plat prêt: ${ligne.tplat.nom_plat} (Table ${ligne.tcommande?.tsessiontable?.ttableresto?.numero_table || '?'})`;
                toast.success(msg, { duration: 4000, icon: '🍽️' });
            }
        });

        socket.on('nouvelle_commande', (cmd: any) => {
            const tableStr = cmd.tsessiontable?.ttableresto?.numero_table 
                ? `Table ${cmd.tsessiontable.ttableresto.numero_table}` 
                : 'Emporter/Livraison';
            toast(`Nouvelle commande (${tableStr})`, { duration: 4000 });
        });

        socket.on('nouvelle_notification', (notif: any) => {
            toast(notif.message, { duration: 4000, icon: '🔔' });
            handleNotification(notif);
        });

        return () => {
            socket.off('statut_ligne_updated');
            socket.off('nouvelle_commande');
            socket.off('nouvelle_notification');
        };
    }, [socket]);

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
        { to: '/serveur/tables', label: 'Tables' },
        { to: '/serveur/scan', label: 'Commande' },
        { to: '/serveur/notifications', label: 'Notifications', badge: unreadCount },
        { to: '/serveur/messagerie', label: 'Messagerie' },
        { to: '/serveur/mon-compte', label: 'Mon Compte' },
        { to: '/serveur/pointage', label: 'Pointage' },
    ];

    return (
        <div className={layoutStyles.dashboardContainer}>
            <Sidebar
                title="Serveur"
                links={sidebarLinks}
                onLogout={handleLogout}
            />

            <main className={layoutStyles.content}>
                <Routes>
                    <Route index element={<Navigate to="tables" replace />} />
                    <Route path="tables" element={<TableView />} />
                    <Route path="scan" element={<ScanQR />} />
                    <Route path="notifications" element={<Notifications role="serveur" />} />
                    <Route path="messagerie" element={<Messagerie />} />
                    <Route path="mon-compte" element={<MonCompte role="serveur" />} />
                    <Route path="pointage" element={<PointageView />} />
                </Routes>
            </main>
        </div>
    );
}

export default ServeurDashboard;
