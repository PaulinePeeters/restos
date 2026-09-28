import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import styles from './MobileNav.module.css';

interface SidebarLink {
    to: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
}

interface MobileNavProps {
    links: SidebarLink[];
    onLogout: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ links, onLogout }) => {
    return (
        <nav className={styles.mobileNav}>
            <div className={styles.navScroll}>
                {links.map((link, index) => (
                    <NavLink
                        key={index}
                        to={link.to}
                        className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
                    >
                        {link.icon && <span className={styles.icon}>{link.icon}</span>}
                        <span className={styles.label}>{link.label}</span>
                        {link.badge !== undefined && link.badge > 0 && (
                            <span className={styles.badge}>{link.badge}</span>
                        )}
                    </NavLink>
                ))}
            </div>
            <button onClick={onLogout} className={styles.logoutBtn} title="Déconnexion">
                <FaSignOutAlt />
            </button>
        </nav>
    );
};

export default MobileNav;
