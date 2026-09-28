import React, { useState, useEffect } from 'react';
import styles from './CookieConsent.module.css';
import Button from './Button';
/* bannière de consentement pour les cookies */
const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState<boolean>(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookieConsent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'accepted');
        setIsVisible(false);
    };

    const handleRefuse = () => {
        localStorage.setItem('cookieConsent', 'refused');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className={styles.banner}>
            <div className={styles.content}>
                <p>
                    🍪 <strong>Nous utilisons des cookies !</strong><br />
                    Nous utilisons des cookies pour améliorer votre expérience et assurer le bon fonctionnement du site.
                </p>
            </div>
            <div className={styles.actions}>
                <Button variant="outline" onClick={handleRefuse} className={styles.btnRefuse}>Refuser</Button>
                <Button variant="primary" onClick={handleAccept}>Accepter</Button>
            </div>
        </div>
    );
};

export default CookieConsent;
