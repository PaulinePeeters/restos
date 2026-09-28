import { Outlet } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import styles from './LayoutPublic.module.css';

/**
 * Layout pour les pages publiques avec Header et Footer.
 * Utilise le pattern Sticky Footer pour garder le footer en bas.
 */
export default function LayoutPublic() {
    return (
        <div className={styles.layout}>
            <Header />
            <main className={styles.main}>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
