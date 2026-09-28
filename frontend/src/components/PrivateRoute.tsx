import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Role } from '../types/prisma-types';

//si pas connecté => redirect login, si connecté mais pas les droits => redirect accueil
interface PrivateRouteProps {
    allowedRoles?: Role[];
}

interface StaffUser {
    role_personnel: Role;
    [key: string]: any;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles }) => {

    const token = sessionStorage.getItem('staffToken') || localStorage.getItem('staffToken');
    const userStr = sessionStorage.getItem('staffUser') || localStorage.getItem('staffUser');
    let user: StaffUser | null = null;

    try {
        if (userStr) {
            user = JSON.parse(userStr);
        }
    } catch (e) {
        console.error("Erreur parsing user", e);
    }

    if (!token || !user) {
        return <Navigate to="/login-staff" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role_personnel) && user.role_personnel !== 'manager') {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default PrivateRoute;
