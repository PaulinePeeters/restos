import React from 'react';
import styles from './LegalNotice.module.css';

const LegalNotice: React.FC = () => {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Mentions Légales</h1>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Éditeur du site</h2>
                <p>
                    <strong>RestOS SRL</strong><br />
                    Société à Responsabilité Limitée<br />
                    Siège social : 123 Rue du Bon Goût, 1000 Bruxelles, Belgique<br />
                    TVA : BE 0123.456.789<br />
                    RPM : Bruxelles
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Contact</h2>
                <p>
                    Email : contact@restos.be<br />
                    Téléphone : +32 2 123 45 67
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Hébergement</h2>
                <p>
                    Ce site est hébergé par :<br />
                    <strong>Vercel Inc.</strong><br />
                    340 S Lemon Ave #4133<br />
                    Walnut, CA 91789, USA
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Propriété intellectuelle</h2>
                <p>
                    L'ensemble de ce site relève de la législation belge et internationale sur le droit d'auteur et la propriété intellectuelle.
                    Tous les droits de reproduction sont réservés.
                </p>
            </section>
        </div>
    );
};

export default LegalNotice;
