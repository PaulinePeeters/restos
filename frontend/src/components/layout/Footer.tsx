import React from 'react';
import { FaFacebookF, FaInstagram, FaXTwitter } from 'react-icons/fa6';
import styles from './Footer.module.css';

const Footer: React.FC = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContent}>
                <div className={styles.footerSection}>
                    <h3>Déclinaison</h3>
                    <p>15 Place du Grand Sablon<br />1000 Bruxelles</p>
                    <p>02 123 45 67</p>
                </div>
                {/* réseau sociaux */}
                <div className={styles.footerSection}>
                    <h3>Suivez-nous</h3>
                    <div className={styles.socialIcons}>
                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FaFacebookF /></a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><FaInstagram /></a>
                        <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X"><FaXTwitter /></a>
                    </div>
                </div>
            </div>
            {/* info légale */}
            <div className={styles.footerBottom}>
                <p>
                    <a href="/login-staff" className={styles.discreteLink}>&copy;</a> {new Date().getFullYear()} RestOS – Tous droits réservés
                </p>
                <div className={styles.footerLinks}>
                    <a href="/privacy">Politique de Confidentialité</a> | <a href="/legal">Mentions Légales</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
