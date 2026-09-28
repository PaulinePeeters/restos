import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaPaperPlane, FaWheelchair, FaParking, FaSun, FaSnowflake, FaWifi } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from './Contact.module.css';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

import logoMarker from '../assets/logo-header.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// icon custom avec logo du resto
const customIcon = new L.Icon({
    iconUrl: logoMarker,
    iconSize: [80, 80],
    iconAnchor: [40, 40],
    popupAnchor: [0, -25],
    className: styles.mapMarker
});

interface ContactFormData {
    nom: string;
    email: string;
    sujet: string;
    message: string;
}

interface Amenity {
    icon: React.ReactNode;
    labelKey: string;
}

const Contact: React.FC = () => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<ContactFormData>({
        nom: '',
        email: '',
        sujet: '',
        message: ''
    });
    const [sending, setSending] = useState(false);
    const [amenities, setAmenities] = useState<Amenity[]>([]);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const data: any = await api.get('/configuration');
                if (data) {
                    const activeAmenities: Amenity[] = [];
                    data.forEach((item: any) => {
                        if (item.cle === 'ACCES_PMR' && item.valeur === 'true') activeAmenities.push({ icon: <FaWheelchair />, labelKey: 'contact.amenity.pmr' });
                        if (item.cle === 'PARKING_DISPONIBLE' && item.valeur === 'true') activeAmenities.push({ icon: <FaParking />, labelKey: 'contact.amenity.parking' });
                        if (item.cle === 'TERRASSE' && item.valeur === 'true') activeAmenities.push({ icon: <FaSun />, labelKey: 'contact.amenity.terrace' });
                        if (item.cle === 'CLIMATISATION' && item.valeur === 'true') activeAmenities.push({ icon: <FaSnowflake />, labelKey: 'contact.amenity.ac' });
                        if (item.cle === 'WIFI_GRATUIT' && item.valeur === 'true') activeAmenities.push({ icon: <FaWifi />, labelKey: 'contact.amenity.wifi' });
                    });
                    setAmenities(activeAmenities);
                }
            } catch (error) {
                console.error("Erreur chargement config", error);
            }
        };
        fetchConfig();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);

        try {
            await api.post('/exports/contact', formData);
            toast.success(t('toast.contact.sent'));
            setFormData({ nom: '', email: '', sujet: '', message: '' });
        } catch (error: any) {
            toast.error(error?.message || t('toast.contact.error'));
        } finally {
            setSending(false);
        }
    };

    const position: [number, number] = [50.8411, 4.3558];

    const MapContainerAny = MapContainer as any;
    const TileLayerAny = TileLayer as any;
    const MarkerAny = Marker as any;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>{t('contact.title')}</h1>
                <p>{t('contact.subtitle')}</p>
            </div>

            <div className={styles.content}>
                {/* Form*/}
                <div className={styles.formContainer}>
                    <h2>{t('contact.form.title')}</h2>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label>{t('contact.form.name')}</label>
                            <input
                                type="text"
                                name="nom"
                                value={formData.nom}
                                onChange={handleChange}
                                required
                                placeholder={t('contact.form.name_ph')}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>{t('contact.form.email')}</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder={t('contact.form.email_ph')}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>{t('contact.form.subject')}</label>
                            <input
                                type="text"
                                name="sujet"
                                value={formData.sujet}
                                onChange={handleChange}
                                required
                                placeholder={t('contact.form.subject_ph')}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>{t('contact.form.message')}</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                placeholder={t('contact.form.message_ph')}
                                rows={5}
                            ></textarea>
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={sending}>
                            {sending ? t('contact.form.sending') : <><FaPaperPlane /> {t('contact.form.submit')}</>}
                        </button>
                    </form>
                </div>

                {/* Infos & Map */}
                <div className={styles.infoContainer}>
                    <div className={styles.contactInfo}>
                        <div className={styles.infoItem}>
                            <FaMapMarkerAlt className={styles.icon} />
                            <div>
                                <h3>{t('contact.info.address.title')}</h3>
                                <p>Place du Grand Sablon 15<br />1000 Bruxelles</p>
                            </div>
                        </div>
                        <div className={styles.infoItem}>
                            <FaPhone className={styles.icon} />
                            <div>
                                <h3>{t('contact.info.phone.title')}</h3>
                                <p>02 555 12 34</p>
                            </div>
                        </div>
                        <div className={styles.infoItem}>
                            <FaEnvelope className={styles.icon} />
                            <div>
                                <h3>{t('contact.info.email.title')}</h3>
                                <p>contact@declinaison.be</p>
                            </div>
                        </div>
                    </div>

                    {amenities.length > 0 && (
                        <div className={styles.amenitiesContainer}>
                            <h3 className={styles.amenitiesTitle}>{t('contact.amenities.title')}</h3>
                            <div className={styles.amenitiesList}>
                                {amenities.map((amenity, index) => (
                                    <div key={index} className={styles.amenityItem}>
                                        <span className={styles.amenityIcon}>{amenity.icon}</span>
                                        <span>{t(amenity.labelKey)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.mapWrapper}>
                        <MapContainerAny center={position} zoom={15} scrollWheelZoom={false} className={styles.map}>
                            <TileLayerAny
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MarkerAny position={position} icon={customIcon}>
                                <Popup>
                                    <strong>{t('contact.map.popup.title')}</strong><br />
                                    {t('contact.map.popup.desc')}
                                </Popup>
                            </MarkerAny>
                        </MapContainerAny>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
