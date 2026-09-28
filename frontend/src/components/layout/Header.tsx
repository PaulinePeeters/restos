import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import logo from '../../assets/logo-header.png';
import { FaShoppingBag, FaUser, FaSignOutAlt, FaSignInAlt } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';

const Header: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();
    const [menuOpen, setMenuOpen] = useState(false);
    const [nomClient, setNomClient] = useState<string | null>(null);
    
    // hook pour récup le client connecté
    useEffect(() => {
        const updateClientNom = () => {
            const userStr = localStorage.getItem('user');
            const staffUserStr = sessionStorage.getItem('staffUser') || localStorage.getItem('staffUser');
            if (staffUserStr) {
                const user = JSON.parse(staffUserStr);
                setNomClient(`${user.prenom_personnel} ${user.nom_personnel} (${user.role_personnel})`);
            } else if (userStr) {
                const user = JSON.parse(userStr);
                setNomClient(user.prenom_client ? `${user.prenom_client} ${user.nom_client}` : user.nom_client);
            } else {
                setNomClient(null);
            }
        };

        updateClientNom();
        window.addEventListener('clientConnecte', updateClientNom);
        return () => {
            window.removeEventListener('clientConnecte', updateClientNom);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.removeItem('staffUser');
        sessionStorage.removeItem('staffToken');
        sessionStorage.removeItem('activeStaffId');

        localStorage.removeItem('staffUser');
        localStorage.removeItem('staffToken');
        localStorage.removeItem('activeStaffId');
        setNomClient(null);
        window.dispatchEvent(new Event('clientConnecte'));
        navigate('/');
    };

    const toggleMenu = () => setMenuOpen(!menuOpen);

    const isActive = (path: string) => (location.pathname === path ? styles.active : '');

    return (
        <header className={styles.header}>
            <div className={styles.logoContainer}>
                <Link to="/">
                    <img src={logo} alt="RestOS Logo" className={styles.logo} />
                </Link>
            </div>

            <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
                <ul className={styles.navLinks}>
                    <li className={isActive('/')}>
                        <Link to="/" onClick={() => setMenuOpen(false)}>{t('nav.home')}</Link>
                    </li>
                    <li className={`${isActive('/panier')} ${styles.mobileOnly}`}>
                        <Link to="/panier" onClick={() => setMenuOpen(false)}><FaShoppingBag className={styles.iconMobile} /> {t('nav.cart') || 'Panier'}</Link>
                    </li>
                    <li className={isActive('/menu')}>
                        <Link to="/menu" onClick={() => setMenuOpen(false)}>{t('nav.menu')}</Link>
                    </li>
                    <li className={isActive('/reservation')}>
                        <Link to="/reservation" onClick={() => setMenuOpen(false)}>{t('nav.reservation')}</Link>
                    </li>
                    <li className={isActive('/contact')}>
                        <Link to="/contact" onClick={() => setMenuOpen(false)}>{t('nav.contact')}</Link>
                    </li>
                </ul>

                {/* Mobile */}
                <div className={styles.mobileUserActions}>
                    <div className={styles.languageSwitcherMobile}>
                        <button
                            onClick={() => setLanguage('fr')}
                            className={`${styles.langBtn} ${language === 'fr' ? styles.activeLang : ''}`}
                        >
                            FR
                        </button>
                        <span className={styles.langSep}>|</span>
                        <button
                            onClick={() => setLanguage('nl')}
                            className={`${styles.langBtn} ${language === 'nl' ? styles.activeLang : ''}`}
                        >
                            NL
                        </button>
                        <span className={styles.langSep}>|</span>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`${styles.langBtn} ${language === 'en' ? styles.activeLang : ''}`}
                        >
                            EN
                        </button>
                    </div>
                    {nomClient ? (
                        <>
                            <Link to="/compte" onClick={() => setMenuOpen(false)}><FaUser /> {t('nav.account')}</Link>
                            <button onClick={() => { handleLogout(); setMenuOpen(false); }}><FaSignOutAlt /> {t('nav.logout')}</button>
                        </>
                    ) : (
                        <Link to="/connexion" onClick={() => setMenuOpen(false)}><FaSignInAlt /> {t('nav.login')}</Link>
                    )}
                </div>
            </nav>

            <div className={styles.userActions}>
                <div className={styles.languageSwitcher}>
                    <button
                        onClick={() => setLanguage('fr')}
                        className={`${styles.langBtn} ${language === 'fr' ? styles.activeLang : ''}`}
                    >
                        FR
                    </button>
                    <span className={styles.langSep}>|</span>
                    <button
                        onClick={() => setLanguage('nl')}
                        className={`${styles.langBtn} ${language === 'nl' ? styles.activeLang : ''}`}
                    >
                        NL
                    </button>
                    <span className={styles.langSep}>|</span>
                    <button
                        onClick={() => setLanguage('en')}
                        className={`${styles.langBtn} ${language === 'en' ? styles.activeLang : ''}`}
                    >
                        EN
                    </button>
                </div>

                <Link to="/panier" className={styles.iconLink} title="Panier">
                    <FaShoppingBag />
                </Link>

                {nomClient ? (
                    <div className={styles.userMenuContainer}>
                        {/* Logique de menu déroulant multi-utilisateurs */}
                        <div className={styles.userInfo}>
                            <span className={styles.welcome}>{t('nav.hello')}, {nomClient}</span>

                            {/* Bouton Switcher - Afficher uniquement si nous avons des sessions */}
                            {localStorage.getItem('staffSessions') && (
                                <div className={styles.sessionSwitcher}>
                                    {(() => {
                                        try {
                                            const sessions = JSON.parse(localStorage.getItem('staffSessions') || '{}');
                                            const activeId = sessionStorage.getItem('activeStaffId') || localStorage.getItem('activeStaffId');
                                            const otherSessions: any[] = Object.values(sessions).filter((s: any) => String(s.user.id) !== String(activeId));

                                            if (otherSessions.length > 0) {
                                                return (
                                                    <div className={styles.switcherDropdown}>
                                                        <span className={styles.switcherLabel}>{t('nav.switch')} :</span>
                                                        {otherSessions.map(session => (
                                                            <button
                                                                key={session.user.id}
                                                                className={styles.switcherButton}
                                                                onClick={() => {
                                                                    sessionStorage.setItem('activeStaffId', session.user.id);
                                                                    sessionStorage.setItem('staffToken', session.token);
                                                                    sessionStorage.setItem('staffUser', JSON.stringify(session.user));

                                                                    localStorage.removeItem('staffToken');
                                                                    localStorage.removeItem('staffUser');
                                                                    localStorage.removeItem('activeStaffId');

                                                                    window.location.reload(); 
                                                                }}
                                                            >
                                                                {session.user.prenom_personnel} ({session.user.role_personnel})
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                        } catch (e) { return null; }
                                    })()}
                                </div>
                            )}
                        </div>

                        <Link to="/compte" className={styles.iconLink} title="Mon Compte">
                            <FaUser />
                        </Link>

                        {(sessionStorage.getItem('staffToken') || localStorage.getItem('staffToken')) && (
                            <Link to="/login-staff" className={`${styles.iconLink} ${styles.addAccountLink}`} title="Ajouter un compte">
                                +
                            </Link>
                        )}

                        <button className={styles.logoutBtn} onClick={handleLogout} title={t('nav.logout_all')}>
                            <FaSignOutAlt />
                        </button>
                    </div>
                ) : (
                    <Link to="/connexion" className={styles.loginBtn}>
                        <FaSignInAlt /> <span>{t('nav.login')}</span>
                    </Link>
                )}
            </div>

            <button
                className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
                onClick={toggleMenu}
                aria-label="Menu"
                aria-expanded={menuOpen}
            >
                <span className={styles.hamburgerLine}></span>
                <span className={styles.hamburgerLine}></span>
                <span className={styles.hamburgerLine}></span>
            </button>
        </header>
    );
};

export default Header;
