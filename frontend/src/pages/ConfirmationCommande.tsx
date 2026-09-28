import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ConfirmationCommande.module.css';
import { useLanguage } from '../context/LanguageContext';

const ConfirmationCommande = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1>{t('confirm.title')}</h1>
                <p>{t('confirm.message1')}</p>
                <p>{t('confirm.message2')}</p>

                <button className={styles.btnHome} onClick={() => navigate('/')}>
                    {t('confirm.back')}
                </button>
            </div>
        </div>
    );
};

export default ConfirmationCommande;
