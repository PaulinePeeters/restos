import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import LayoutPublic from './LayoutPublic';
import ScrollToTop from './components/ScrollToTop';

import Accueil from './pages/Accueil';
import Menu from './pages/Menu';
import Reservation from './pages/Reservation';
import Contact from './pages/Contact';
import LoginInscription from './pages/LoginInscription';
import Panier from './pages/Panier';
import Paiement from './pages/Paiement';
import ConfirmationCommande from './pages/ConfirmationCommande';
import AvisClient from './client/AvisClient';
import PrivacyPolicy from './pages/PrivacyPolicy';
import LegalNotice from './pages/LegalNotice';
import NotFound from './pages/NotFound';

import MenuAccess from './pages/MenuAccess';
import PrintQRCard from './pages/PrintQRCard';
import ThemeManager from './components/ThemeManager';
import LoginStaff from './pages/LoginStaff';
import PrivateRoute from './components/PrivateRoute';
import MonCompte from './components/common/MonCompte';

import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';
import NetworkStatus from './components/NetworkStatus';
import CookieConsent from './components/ui/CookieConsent';
import { LanguageProvider } from './context/LanguageContext';

import styles from './App.module.css';
import declinaisonFavicon from './assets/logo-header.png';
import restosFavicon from './assets/logo_restos.jpeg';

// Lazy loading des dashboards
const ManagerDashboard = React.lazy(() => import('./manager/ManagerDashboard'));
const ServeurDashboard = React.lazy(() => import('./serveur/ServeurDashboard'));
const LivreurDashboard = React.lazy(() => import('./livreur/LivreurDashboard'));
const CuisineDashboard = React.lazy(() => import('./cuisine/CuisineDashboard'));
const BarDashboard = React.lazy(() => import('./bar/BarDashboard'));
const PointageView = React.lazy(() => import('./pages/PointageView'));

const LoadingFallback = () => (
    <div className={styles.loadingContainer}>
        <div className={styles.spinner}>Chargement...</div>
    </div>
);

const STAFF_PATH_PREFIXES = ['/manager', '/serveur', '/livreur', '/cuisine', '/bar'];
const STAFF_EXACT_PATHS = new Set(['/login-staff', '/pointage']);

const RouteMetaManager = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        const isStaffPath = STAFF_EXACT_PATHS.has(pathname) || STAFF_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

        const title = isStaffPath ? 'RestOS' : 'Déclinaison';
        const faviconHref = isStaffPath ? restosFavicon : declinaisonFavicon;

        document.title = title;

        let favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = faviconHref;
    }, [pathname]);

    return null;
};

function App() {
    useEffect(() => {
        const checkSessionExpiry = () => {
            const EXPIRY_TIME_MS = 4 * 60 * 60 * 1000; // 4 hours
            const timestampStr = localStorage.getItem('session_timestamp');
            const sessionId = localStorage.getItem('session_id');

            if (sessionId) {
                if (timestampStr) {
                    const timestamp = parseInt(timestampStr, 10);
                    if (Date.now() - timestamp > EXPIRY_TIME_MS) {
                        localStorage.removeItem('table_id');
                        localStorage.removeItem('session_id');
                        localStorage.removeItem('panier');
                        localStorage.removeItem('commande_en_cours');
                        localStorage.removeItem('session_timestamp');
                        window.dispatchEvent(new Event('panierMisAJour'));
                        console.log('Session client expirée et nettoyée.');
                    } else {
                        // Prolonge la session tant que le client est actif
                        localStorage.setItem('session_timestamp', Date.now().toString());
                    }
                } else {
                    // Initialise le timestamp s'il n'existe pas encore
                    localStorage.setItem('session_timestamp', Date.now().toString());
                }
            }
        };

        checkSessionExpiry();
    }, []);

    return (
        <SocketProvider>
            <Toaster position="top-center" reverseOrder={false} />
            <LanguageProvider>
                <NetworkStatus />
                <CookieConsent />
                <Router>
                    <RouteMetaManager />
                    <ScrollToTop />
                    <ThemeManager>
                        <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                                {/* Routes publiques avec Header/Footer */}
                                <Route path="/" element={<LayoutPublic />}>
                                    <Route index element={<Accueil />} />
                                    <Route path="menu" element={<Menu />} />
                                    <Route path="reservation" element={<Reservation />} />
                                    <Route path="contact" element={<Contact />} />
                                    <Route path="connexion" element={<LoginInscription />} />
                                    <Route path="compte" element={<MonCompte />} />
                                    <Route path="panier" element={<Panier />} />
                                    <Route path="paiement" element={<Paiement />} />
                                    <Route path="confirmation" element={<ConfirmationCommande />} />
                                    <Route path="avis/:commandeId" element={<AvisClient />} />
                                    <Route path="privacy" element={<PrivacyPolicy />} />
                                    <Route path="legal" element={<LegalNotice />} />
                                </Route>

                                {/* Routes sans Header/Footer */}
                                <Route path="/print-qr-card" element={<PrintQRCard />} />
                                <Route path="/login-staff" element={<LoginStaff />} />
                                <Route path="/menu-access" element={<MenuAccess />} />

                                {/* Routes privées Staff */}
                                <Route element={<PrivateRoute allowedRoles={['manager', 'super_admin']} />}>
                                    <Route path="/manager/*" element={<ManagerDashboard />} />
                                </Route>

                                <Route element={<PrivateRoute allowedRoles={['serveur']} />}>
                                    <Route path="/serveur/*" element={<ServeurDashboard />} />
                                </Route>

                                <Route element={<PrivateRoute allowedRoles={['livreur']} />}>
                                    <Route path="/livreur/*" element={<LivreurDashboard />} />
                                </Route>

                                <Route element={<PrivateRoute allowedRoles={['cuisinier']} />}>
                                    <Route path="/cuisine/*" element={<CuisineDashboard />} />
                                </Route>

                                <Route element={<PrivateRoute allowedRoles={['barman']} />}>
                                    <Route path="/bar/*" element={<BarDashboard />} />
                                </Route>

                                {/* Routes communes Staff */}
                                <Route element={<PrivateRoute allowedRoles={['manager', 'serveur', 'cuisinier', 'livreur', 'barman', 'super_admin']} />}>
                                    <Route path="/pointage" element={<PointageView />} />
                                </Route>

                                {/* 404 */}
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        </Suspense>
                    </ThemeManager>
                </Router>
            </LanguageProvider>
        </SocketProvider>
    );
}

export default App;
