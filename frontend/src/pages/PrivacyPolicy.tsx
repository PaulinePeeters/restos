import React from 'react';
import styles from './PrivacyPolicy.module.css';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Politique de Confidentialité</h1>
            <p className={styles.metaInfo}>Dernière mise à jour : {new Date().toLocaleDateString()}</p>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>1. Collecte des données</h2>
                <p>
                    Nous collectons les informations suivantes lorsque vous passez commande ou créez un compte :
                    <ul>
                        <li>Nom et prénom</li>
                        <li>Adresse email</li>
                        <li>Numéro de téléphone</li>
                        <li>Adresse de livraison</li>
                    </ul>
                    Ces données sont nécessaires pour le traitement et la livraison de vos commandes.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>2. Utilisation des données</h2>
                <p>
                    Vos données sont utilisées uniquement pour :
                    <ul>
                        <li>Gérer votre compte client</li>
                        <li>Traiter vos commandes et paiements</li>
                        <li>Vous informer de l'état de votre livraison</li>
                    </ul>
                    Nous ne revendons jamais vos données à des tiers.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>3. Conservation des données</h2>
                <p>
                    Vos données personnelles sont conservées aussi longtemps que votre compte est actif.
                    Conformément à la loi, les factures sont conservées pendant 7 ans.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>4. Vos droits</h2>
                <p>
                    Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.
                    Pour exercer ce droit, contactez-nous à : <strong>privacy@restos.be</strong>.
                </p>
            </section>
        </div>
    );
};

export default PrivacyPolicy;
