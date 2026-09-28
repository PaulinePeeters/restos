import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LoginStaff.module.css';
import api from '../services/api';
import logo from '../assets/logo_restos.jpeg';

const STAFF_AUTH_REDIRECT_MESSAGE_KEY = 'staffAuthRedirectMessage';

function LoginStaff() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [animStep, setAnimStep] = useState(0); 
    const navigate = useNavigate();

    useEffect(() => {
        // Le logo bouge vers top left
        const t1 = setTimeout(() => {
            setAnimStep(1);
        }, 800);

        // Le form apparait
        const t2 = setTimeout(() => {
            setAnimStep(2);
        }, 1400);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    useEffect(() => {
        const redirectMessage = sessionStorage.getItem(STAFF_AUTH_REDIRECT_MESSAGE_KEY);
        if (redirectMessage) {
            setError(redirectMessage);
            sessionStorage.removeItem(STAFF_AUTH_REDIRECT_MESSAGE_KEY);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data: any = await api.post('/personnels/login', { email_personnel: email, mot_de_passe: password });

            // Multi-session
            const newSession = {
                token: data.token,
                user: data.personnel,
                loginTime: new Date().toISOString()
            };

            const sessionsStr = localStorage.getItem('staffSessions');
            let sessions: any = sessionsStr ? JSON.parse(sessionsStr) : {};

            // ajout ou update session pour cet utilisateur
            sessions[data.personnel.id] = newSession;

            localStorage.setItem('staffSessions', JSON.stringify(sessions));

            // utilisation du sessionStorage pour la session active (isolé par onglet)
            sessionStorage.setItem('activeStaffId', String(data.personnel.id));
            sessionStorage.setItem('staffToken', data.token);
            sessionStorage.setItem('staffUser', JSON.stringify(data.personnel));

            // suppression de la session client pour éviter les conflits
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.dispatchEvent(new Event('clientConnecte'));

            // Redirection selon le rôle
            switch (data.personnel.role_personnel) {
                case 'manager':
                    navigate('/manager');
                    break;
                case 'serveur':
                    navigate('/serveur');
                    break;
                case 'cuisinier':
                    navigate('/cuisine');
                    break;
                case 'livreur':
                    navigate('/livreur');
                    break;
                case 'barman':
                    navigate('/bar');
                    break;
                default:
                    navigate('/');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={`${styles.logoContainer} ${animStep > 0 ? styles.moved : ''}`}>
                <img src={logo} alt="RestOS Logo" className={styles.logo} />
            </div>

            <div className={`${styles.card} ${animStep === 2 ? styles.visible : ''}`}>
                <h1 className={styles.title}>Staff de Déclinaison</h1>
                <p className={styles.subtitle}>Accès réservé au personnel</p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="votre@email.com"
                            autoComplete="username"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Mot de passe</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>

                    <button type="submit" className={styles.button} disabled={loading}>
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default LoginStaff;
