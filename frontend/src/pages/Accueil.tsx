import React from 'react';
import styles from './Accueil.module.css';
import logo from '../assets/logo.png';
import plat1 from '../assets/burrata.jpg';
import plat2 from '../assets/saumon.jpg';
import plat3 from '../assets/cremeux.jpg';
import ambiance1 from '../assets/devanture.jpg';
import ambiance2 from '../assets/resto.jpg';
import ambiance3 from '../assets/vin.jpg';
import { useLanguage } from '../context/LanguageContext';

const Accueil: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className={styles['accueil-container']}>
            <section className={styles['logo-section']}>
                <img src={logo} alt="Déclinaison - Logo" className={styles['logo-accueil']} />
            </section>

            <section className={styles['vision-section']}>
                <h2>{t('home.vision.title')}</h2>
                <p>{t('home.vision.text')}</p>
            </section>

            <section className={styles['galerie-section']}>
                <h3>{t('home.gallery.title')}</h3>
                <div className={styles['galerie']}>
                    <img src={ambiance1} alt="Devanture" />
                    <img src={ambiance2} alt="Ambiance du restaurant" />
                    <img src={ambiance3} alt="Cave à vins" />
                    <img src={plat1} alt="Burrata" />
                    <img src={plat2} alt="Saumon" />
                    <img src={plat3} alt="Crémeux" />
                </div>
            </section>
        </div>
    );
};

export default Accueil;
