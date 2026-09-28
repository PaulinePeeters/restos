import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

// Page 404 - Route non trouvée.
export default function NotFound() {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>404</h1>
            <p className={styles.message}>Page non trouvée</p>
            <Link to="/" className={styles.link}>
                Retour à l'accueil
            </Link>
        </div>
    );
}
