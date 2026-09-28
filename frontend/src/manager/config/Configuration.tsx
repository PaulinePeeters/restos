import React, { useState, useEffect } from 'react';
import { FaWheelchair, FaParking, FaSun, FaSnowflake, FaWifi } from 'react-icons/fa';
import styles from './Configuration.module.css';
import toast from 'react-hot-toast';
import PlanSalle from './PlanSalle';
import EventsGestion from './EventsGestion';
import Button from '../../components/ui/Button';

import Input from '../../components/ui/Input';
import api from '../../services/api';
import { tconfiguration } from '../../types/prisma-types';
import { useLanguage } from '../../context/LanguageContext';

// FilePond
import { FilePond, registerPlugin } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

registerPlugin(FilePondPluginImagePreview);

interface ConfigData {
    nom: string;
    logoUrl: string;
    horaires: string;
    adresse: string;
    telephone: string;
    email: string;
    [key: string]: any;
}

interface AmenitiesData {
    pmr: boolean;
    parking: boolean;
    terrasse: boolean;
    climatisation: boolean;
    wifi: boolean;
    [key: string]: any;
}


const Configuration = () => {
    const { t } = useLanguage();
    const [onglet, setOnglet] = useState('etablissement');
    const [theme, setTheme] = useState('DEFAUT');

    const [config, setConfig] = useState<ConfigData>({
        nom: 'Déclinaison',
        logoUrl: '',
        horaires: '11h - 13h30 et 18h - 22h30',
        adresse: '123 Rue du Bon Goût, Bruxelles',
        telephone: '+32 2 123 45 67',
        email: 'contact@declinaison.be',
    });

    const [amenities, setAmenities] = useState<AmenitiesData>({
        pmr: false,
        parking: false,
        terrasse: false,
        climatisation: false,
        wifi: false
    });


    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const data: tconfiguration[] | null = await api.get('/configuration');
                if (data) {
                    setConfig(prevConfig => {
                        const newConfig = { ...prevConfig };
                        data.forEach(item => {
                            if (item.cle === 'RESTAURANT_NOM') newConfig.nom = item.valeur ?? '';
                            if (item.cle === 'RESTAURANT_LOGO') newConfig.logoUrl = item.valeur ?? '';
                            if (item.cle === 'RESTAURANT_HORAIRES') newConfig.horaires = item.valeur ?? '';
                            if (item.cle === 'RESTAURANT_ADRESSE') newConfig.adresse = item.valeur ?? '';
                            if (item.cle === 'RESTAURANT_TELEPHONE') newConfig.telephone = item.valeur ?? '';
                            if (item.cle === 'RESTAURANT_EMAIL') newConfig.email = item.valeur ?? '';
                        });
                        return newConfig;
                    });


                    setAmenities(prevAmenities => {
                        const newAmenities = { ...prevAmenities };
                        data.forEach(item => {
                            if (item.cle === 'ACCES_PMR') newAmenities.pmr = item.valeur === 'true';
                            if (item.cle === 'PARKING_DISPONIBLE') newAmenities.parking = item.valeur === 'true';
                            if (item.cle === 'TERRASSE') newAmenities.terrasse = item.valeur === 'true';
                            if (item.cle === 'CLIMATISATION') newAmenities.climatisation = item.valeur === 'true';
                            if (item.cle === 'WIFI_GRATUIT') newAmenities.wifi = item.valeur === 'true';
                        });
                        return newAmenities;
                    });

                    data.forEach(item => {
                        if (item.cle === 'THEME_ACTIF') setTheme(item.valeur ?? 'DEFAUT');
                    });
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchConfig();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setConfig((prev) => ({ ...prev, [name]: value }));
    };

    const handleAmenityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setAmenities((prev) => ({ ...prev, [name]: checked }));
    };

    const handleThemeChange = async (newTheme: string) => {
        setTheme(newTheme);
        try {
            await api.post('/configuration', { cle: 'THEME_ACTIF', valeur: newTheme });
        } catch (error) {
            console.error("Erreur sauvegarde thème", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const configsToSave = [
            { cle: 'RESTAURANT_NOM', valeur: config.nom },
            { cle: 'RESTAURANT_LOGO', valeur: config.logoUrl },
            { cle: 'RESTAURANT_HORAIRES', valeur: config.horaires },
            { cle: 'RESTAURANT_ADRESSE', valeur: config.adresse },
            { cle: 'RESTAURANT_TELEPHONE', valeur: config.telephone },
            { cle: 'RESTAURANT_EMAIL', valeur: config.email },
            { cle: 'ACCES_PMR', valeur: String(amenities.pmr) },
            { cle: 'PARKING_DISPONIBLE', valeur: String(amenities.parking) },
            { cle: 'TERRASSE', valeur: String(amenities.terrasse) },
            { cle: 'CLIMATISATION', valeur: String(amenities.climatisation) },
            { cle: 'WIFI_GRATUIT', valeur: String(amenities.wifi) },
        ];

        try {
            await api.post('/configuration/bulk', configsToSave);
            toast.success(t('toast.config.saved'));
        } catch (error) {
            console.error(error);
            toast.error(t('toast.config.save_error'));
        }
    };

    const renderContent = () => {
        switch (onglet) {
            case 'etablissement':
                return (
                    <div className={styles.configurationManager}>
                        <h3>Configuration de l'enseigne</h3>
                        <form onSubmit={handleSubmit} className={styles.formConfig}>
                            <Input
                                label="Nom du restaurant"
                                name="nom"
                                value={config.nom}
                                onChange={handleChange}
                                required
                            />

                            <div className={styles.filePondContainer}>
                                <label className={styles.label}>Logo du restaurant</label>
                                <FilePond
                                    files={config.logoUrl ? [{ source: config.logoUrl, options: { type: 'local' } }] : []}
                                    onupdatefiles={(fileItems) => {
                                    }}
                                    allowMultiple={false}
                                    maxFiles={1}
                                    server={{
                                        process: (fieldName, file, metadata, load, error, progress, abort, transfer, options) => {
                                            const formData = new FormData();
                                            formData.append('logo', file);

                                            api.upload('/configuration/logo', formData)
                                                .then((res: any) => {
                                                    setConfig(prev => ({ ...prev, logoUrl: res.url }));
                                                    load(res.url);
                                                    toast.success(t('toast.config.logo_updated'));
                                                })
                                                .catch((err: any) => {
                                                    console.error(err);
                                                    error('Erreur upload');
                                                    toast.error(t('toast.config.logo_upload_error'));
                                                });
                                        },
                                        load: (source, load, error, progress, abort, headers) => {
                                            fetch(source).then(res => res.blob()).then(load);
                                        }
                                    }}
                                    name="logo"
                                    labelIdle='Glissez votre logo ou <span class="filepond--label-action">Parcourir</span>'
                                />
                            </div>

                            <Input
                                label="Horaires d'ouverture"
                                name="horaires"
                                value={config.horaires}
                                onChange={handleChange}
                                required
                            />

                            <Input
                                label="Adresse"
                                name="adresse"
                                value={config.adresse}
                                onChange={handleChange}
                            />

                            <Input
                                label="Téléphone"
                                type="tel"
                                name="telephone"
                                value={config.telephone}
                                onChange={handleChange}
                                placeholder="+32 4 123 45 67"
                            />

                            <Input
                                label="Email"
                                type="email"
                                name="email"
                                value={config.email}
                                onChange={handleChange}
                                placeholder="contact@declinaison.be"
                            />

                            <div className={styles.amenitiesSection}>
                                <h4>Commodités & Services</h4>
                                <div className={styles.amenitiesGrid}>
                                    <label className={`${styles.amenityItem} ${amenities.pmr ? styles.active : ''}`}>
                                        <input
                                            type="checkbox"
                                            name="pmr"
                                            checked={amenities.pmr}
                                            onChange={handleAmenityChange}
                                        />
                                        <FaWheelchair size={24} />
                                        <span>Accès PMR</span>
                                    </label>
                                    <label className={`${styles.amenityItem} ${amenities.parking ? styles.active : ''}`}>
                                        <input
                                            type="checkbox"
                                            name="parking"
                                            checked={amenities.parking}
                                            onChange={handleAmenityChange}
                                        />
                                        <FaParking size={24} />
                                        <span>Parking</span>
                                    </label>
                                    <label className={`${styles.amenityItem} ${amenities.terrasse ? styles.active : ''}`}>
                                        <input
                                            type="checkbox"
                                            name="terrasse"
                                            checked={amenities.terrasse}
                                            onChange={handleAmenityChange}
                                        />
                                        <FaSun size={24} />
                                        <span>Terrasse</span>
                                    </label>
                                    <label className={`${styles.amenityItem} ${amenities.climatisation ? styles.active : ''}`}>
                                        <input
                                            type="checkbox"
                                            name="climatisation"
                                            checked={amenities.climatisation}
                                            onChange={handleAmenityChange}
                                        />
                                        <FaSnowflake size={24} />
                                        <span>Climatisation</span>
                                    </label>
                                    <label className={`${styles.amenityItem} ${amenities.wifi ? styles.active : ''}`}>
                                        <input
                                            type="checkbox"
                                            name="wifi"
                                            checked={amenities.wifi}
                                            onChange={handleAmenityChange}
                                        />
                                        <FaWifi size={24} />
                                        <span>Wifi Gratuit</span>
                                    </label>
                                </div>
                            </div>

                            <Button type="submit">
                                Sauvegarder
                            </Button>
                        </form>
                    </div>
                );
            case 'plansalle':
                return <PlanSalle />;
            case 'siteweb':
                return (
                    <div className={styles.configurationManager}>
                        <h3>Configuration du site web</h3>

                        <div className={styles.sectionTitle}>
                            <h4>Thème Événementiel</h4>
                            <p className={styles.subtitle}>Activez un thème pour changer l'apparence du site client.</p>
                        </div>

                        <div className={styles.themeSelector}>
                            <label className={`${styles.themeCard} ${styles.themeCardDefault} ${theme === 'DEFAUT' ? styles.activeDefault : ''}`}>
                                <input type="radio" name="theme" value="DEFAUT" checked={theme === 'DEFAUT'} onChange={() => handleThemeChange('DEFAUT')} className={styles.radioInput} />
                                <strong>Défaut</strong>
                                <div className={styles.themeDesc}>Style standard</div>
                            </label>

                            <label className={`${styles.themeCard} ${styles.themeCardNoel} ${theme === 'NOEL' ? styles.activeNoel : ''}`}>
                                <input type="radio" name="theme" value="NOEL" checked={theme === 'NOEL'} onChange={() => handleThemeChange('NOEL')} className={styles.radioInput} />
                                <strong>Noël</strong>
                                <div className={styles.themeDesc}>Rouge & Cœurs</div>
                            </label>

                            <label className={`${styles.themeCard} ${styles.themeCardValentin} ${theme === 'VALENTIN' ? styles.activeValentin : ''}`}>
                                <input type="radio" name="theme" value="VALENTIN" checked={theme === 'VALENTIN'} onChange={() => handleThemeChange('VALENTIN')} className={styles.radioInput} />
                                <strong>St-Valentin</strong>
                                <div className={styles.themeDesc}>Rose & Cœurs</div>
                            </label>
                        </div>

                        <div className={styles.sectionTitle}>
                            <h4>Gestion des Événements & Menus</h4>
                            <p className={styles.subtitle}>Créez des événements, menus spéciaux ou promotions qui s'afficheront sur le site.</p>
                        </div>

                        <EventsGestion />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Configuration</h2>
                <p className="page-subtitle">Paramétrez votre établissement, le plan de salle et le site web.</p>
            </div>
            <div className={styles.tabs}>
                <Button
                    onClick={() => setOnglet('etablissement')}
                    variant={onglet === 'etablissement' ? 'primary' : 'outline'}
                >
                    Établissement
                </Button>
                <Button
                    onClick={() => setOnglet('plansalle')}
                    variant={onglet === 'plansalle' ? 'primary' : 'outline'}
                >
                    Plan de salle
                </Button>
                <Button
                    onClick={() => setOnglet('siteweb')}
                    variant={onglet === 'siteweb' ? 'primary' : 'outline'}
                >
                    Site web
                </Button>
            </div>

            <div className={styles['configuration-content']}>
                {renderContent()}
            </div>
        </div>
    );
};

export default Configuration;
