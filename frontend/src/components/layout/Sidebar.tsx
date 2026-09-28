import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';
import MobileNav from './MobileNav';

interface SidebarLink {
    to: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
}

interface SidebarProps {
    title: string;
    links: SidebarLink[];
    headerContent?: React.ReactNode;
    footerContent?: React.ReactNode;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ title, links, headerContent, footerContent, onLogout }) => {
    return (
        <>
            <nav className={styles.sidebar}>
            <div className={styles.header}>
                <h2>{title}</h2>
                {headerContent && <div className={styles.headerContent}>{headerContent}</div>}
            </div>

            <ul className={styles.navList}>
                {links.map((link, index) => (
                    <li key={index}>
                        <NavLink
                            to={link.to}
                            className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
                        >
                            {link.icon && <span className={styles.icon}>{link.icon}</span>}
                            <span className={styles.label}>{link.label}</span>
                            {link.badge !== undefined && link.badge > 0 && (
                                <span className={styles.badge}>{link.badge}</span>
                            )}
                        </NavLink>
                    </li>
                ))}
            </ul>

            <div className={styles.footer}>
                {footerContent && <div className={styles.footerContent}>{footerContent}</div>}

                <button onClick={onLogout} className={styles.logoutButton}>
                    Déconnexion
                </button>
            </div>
        </nav>
        <MobileNav links={links} onLogout={onLogout} />
        </>
    );
};

export default Sidebar;
