import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import styles from './AvisClient.module.css';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

function AvisClient() {
    const { commandeId } = useParams<{ commandeId: string }>();
    const { t } = useLanguage();
    const [note, setNote] = useState(5);
    const [commentaire, setCommentaire] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        try {
            await api.post('/avis', { commandeId, note, commentaire });
            setSubmitted(true);
        } catch (error) {
            console.error(error);
            toast.error(t('toast.avis.error'));
        }
    };

    if (submitted) {
        return (
            <div className={styles.container}>
                <h2 className={styles.title}>Merci !</h2>
                <p className={styles.successMessage}>Votre avis a bien été pris en compte.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Votre avis nous intéresse</h1>
            <p className={styles.subtitle}>Commande #{commandeId}</p>

            <div className={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                        key={star}
                        className={`${styles.star} ${star <= note ? styles.starActive : ''}`}
                        onClick={() => setNote(star)}
                    />
                ))}
            </div>

            <textarea
                className={styles.textarea}
                placeholder="Dites-nous ce que vous avez pensé de votre repas..."
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
            />

            <button className={styles.btnSubmit} onClick={handleSubmit}>
                Envoyer mon avis
            </button>
        </div>
    );
}

export default AvisClient;
