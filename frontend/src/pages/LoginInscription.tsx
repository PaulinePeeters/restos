import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import styles from './LoginInscription.module.css';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface AddressData {
    rue: string;
    numero: string;
    cp: string;
    ville: string;
    est_par_defaut: boolean;
}

interface RegisterFormData {
    nom_client: string;
    email_client: string;
    tel_client: string;
    entreprise: string;
    tva: string;
    mot_de_passe: string;
    adresse: AddressData;
}

interface LoginFormData {
    email_client: string;
    mot_de_passe: string;
}

export default function LoginInscription() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [isRightPanelActive, setIsRightPanelActive] = useState(false);

    const [formLogin, setFormLogin] = useState<LoginFormData>({ email_client: '', mot_de_passe: '' });
    const [formRegister, setFormRegister] = useState<RegisterFormData>({
        nom_client: '',
        email_client: '',
        tel_client: '',
        entreprise: '',
        tva: '',
        mot_de_passe: '',
        adresse: {
            rue: '',
            numero: '',
            cp: '',
            ville: '',
            est_par_defaut: true
        }
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data: any = await api.post('/clients/login', formLogin);
            if (data) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.client));

                localStorage.removeItem('staffUser');
                localStorage.removeItem('staffToken');
                toast.success(t('toast.login.welcome', { name: data.client.nom_client }));
                window.dispatchEvent(new Event('clientConnecte'));
                navigate('/');
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || t('toast.login.error'));
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await api.post('/clients/register', formRegister);
            if (data) {
                toast.success(t('toast.login.register_success'));
                setIsRightPanelActive(false);
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || t('toast.login.register_error'));
        }
    };

    return (
        <div className={styles.body}>
            <div className={styles.mobileTabs}>
                <button 
                    className={`${styles.tabBtn} ${!isRightPanelActive ? styles.activeTab : ''}`}
                    onClick={() => setIsRightPanelActive(false)}
                >
                    {t('auth.login.title')}
                </button>
                <button 
                    className={`${styles.tabBtn} ${isRightPanelActive ? styles.activeTab : ''}`}
                    onClick={() => setIsRightPanelActive(true)}
                >
                    {t('auth.register.title')}
                </button>
            </div>
            <div className={`${styles.container} ${isRightPanelActive ? styles.rightPanelActive : ''}`} id="container">

                <div className={`${styles.formContainer} ${styles.signUpContainer}`}>
                    <form onSubmit={handleRegister} className={`${styles.form} ${styles.scrollableForm}`}>
                        <h1 className={styles.title}>{t('auth.register.title')}</h1>
                        <span className={styles.subtitle}>{t('auth.register.subtitle')}</span>

                        <input className={styles.input} type="text" placeholder="Nom complet" value={formRegister.nom_client} onChange={(e) => setFormRegister({ ...formRegister, nom_client: e.target.value })} required />
                        <input className={styles.input} type="email" placeholder="Email" value={formRegister.email_client} onChange={(e) => setFormRegister({ ...formRegister, email_client: e.target.value })} required />
                        <input className={styles.input} type="password" placeholder="Mot de passe" value={formRegister.mot_de_passe} onChange={(e) => setFormRegister({ ...formRegister, mot_de_passe: e.target.value })} required />
                        <input className={styles.input} type="tel" placeholder="Téléphone" value={formRegister.tel_client} onChange={(e) => setFormRegister({ ...formRegister, tel_client: e.target.value })} />
                        
                        <h4 className={styles.sectionTitle}>Facturation (Optionnel)</h4>
                        <input className={styles.input} type="text" placeholder="Nom de l'entreprise" value={formRegister.entreprise} onChange={(e) => setFormRegister({ ...formRegister, entreprise: e.target.value })} />
                        <input className={styles.input} type="text" placeholder="Numéro de TVA" value={formRegister.tva} onChange={(e) => setFormRegister({ ...formRegister, tva: e.target.value })} />

                        <h4 className={styles.sectionTitle}>{t('auth.address.title')}</h4>
                        <div className={styles.addressRow}>
                            <input className={`${styles.input} ${styles.flex3}`} type="text" placeholder="Rue" value={formRegister.adresse.rue} onChange={(e) => setFormRegister({ ...formRegister, adresse: { ...formRegister.adresse, rue: e.target.value } })} required />
                            <input className={`${styles.input} ${styles.flex1}`} type="text" placeholder="N°" value={formRegister.adresse.numero} onChange={(e) => setFormRegister({ ...formRegister, adresse: { ...formRegister.adresse, numero: e.target.value } })} required />
                        </div>
                        <div className={styles.addressRow}>
                            <input className={`${styles.input} ${styles.flex1}`} type="text" placeholder="CP" value={formRegister.adresse.cp} onChange={(e) => setFormRegister({ ...formRegister, adresse: { ...formRegister.adresse, cp: e.target.value } })} required />
                            <input className={`${styles.input} ${styles.flex2}`} type="text" placeholder="Ville" value={formRegister.adresse.ville} onChange={(e) => setFormRegister({ ...formRegister, adresse: { ...formRegister.adresse, ville: e.target.value } })} required />
                        </div>

                        <div className={styles.consentContainer}>
                            <input
                                type="checkbox"
                                id="consentCheckbox"
                                required
                                className={styles.consentCheckbox}
                            />
                            <label htmlFor="consentCheckbox" className={styles.consentLabel}>
                                {t('auth.consent')}
                            </label>
                        </div>

                        <button className={styles.button} type="submit">{t('auth.register.submit')}</button>
                    </form>
                </div>

                <div className={`${styles.formContainer} ${styles.signInContainer}`}>
                    <form onSubmit={handleLogin} className={styles.form}>
                        <h1 className={styles.title}>{t('auth.login.title')}</h1>
                        <span className={styles.subtitle}>{t('auth.login.subtitle')}</span>
                        <input className={styles.input} type="email" placeholder="Email" value={formLogin.email_client} onChange={(e) => setFormLogin({ ...formLogin, email_client: e.target.value })} required />
                        <input className={styles.input} type="password" placeholder="Mot de passe" value={formLogin.mot_de_passe} onChange={(e) => setFormLogin({ ...formLogin, mot_de_passe: e.target.value })} required />
                        <a href="/reset-password" className={styles.forgotPasswordLink}>{t('auth.forgot_password')}</a>
                        <button className={styles.button} type="submit">{t('auth.login.submit')}</button>
                    </form>
                </div>

                <div className={styles.overlayContainer}>
                    <div className={styles.overlay}>
                        <div className={`${styles.overlayPanel} ${styles.overlayLeft}`}>
                            <h1 className={`${styles.title} ${styles.overlayTitle}`}>{t('auth.overlay.welcome_back.title')}</h1>
                            <p className={styles.overlayText}>{t('auth.overlay.welcome_back.text')}</p>
                            <button className={`${styles.button} ${styles.ghost}`} onClick={() => setIsRightPanelActive(false)}>{t('auth.overlay.welcome_back.button')}</button>
                        </div>
                        <div className={`${styles.overlayPanel} ${styles.overlayRight}`}>
                            <h1 className={`${styles.title} ${styles.overlayTitle}`}>{t('auth.overlay.hello.title')}</h1>
                            <p className={styles.overlayText}>{t('auth.overlay.hello.text')}</p>
                            <button className={`${styles.button} ${styles.ghost}`} onClick={() => setIsRightPanelActive(true)}>{t('auth.overlay.hello.button')}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
