import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// Permet d'accéder au menu directement via un QR code
// 2 cas de figure : 
// - Event en pleine page : affiche l'événement en grand
// - Event non en pleine page : affiche le menu normalement
export default function MenuAccess() {
    const [error, setError] = useState('');
    const [sessionReady, setSessionReady] = useState(false);
    const [activeEvent, setActiveEvent] = useState<any>(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const tableId = new URLSearchParams(window.location.search).get('table_id');
        if (!tableId) {
            setError('Table ID manquant dans l’URL');
            return;
        }
        
        const fetchInitialData = async () => {
            try {
                const [sessionData, eventData] = await Promise.all([
                    api.get(`/session/menu-access?table_id=${tableId}`),
                    api.get('/events/active').catch(() => null)
                ]);
                
                if (sessionData) {
                    localStorage.setItem('session_id', (sessionData as any).session_id);
                    setSessionReady(true);
                }
                if (eventData) {
                    setActiveEvent(eventData);
                }
                setDataLoaded(true);
            } catch (err: any) {
                console.error('Erreur MenuAccess.js :', err.message);
                setError("Erreur chargement :" + err.message);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (dataLoaded && sessionReady) {
            if (!activeEvent || activeEvent.format !== 'PLEINE_PAGE') {
                navigate('/menu');
            }
        }
    }, [dataLoaded, sessionReady, activeEvent, navigate]);
    // Si l'événement est en pleine page, afficher l'événement en grand
    if (dataLoaded && sessionReady && activeEvent && activeEvent.format === 'PLEINE_PAGE') {
        const bgOpacity = activeEvent.opacity !== undefined ? activeEvent.opacity : 1;
        return (
            <div style={{
                minHeight: '100vh',
                width: '100vw',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 9999,
                backgroundColor: activeEvent.couleur_principale || '#ffffff',
                color: activeEvent.couleur_texte || '#000000',
                fontFamily: activeEvent.font || 'inherit',
                textAlign: (activeEvent.text_align || 'center') as any,
                backgroundImage: activeEvent.image_url ? `linear-gradient(rgba(0,0,0,${bgOpacity}), rgba(0,0,0,${bgOpacity})), url(${activeEvent.image_url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem'
            }}>
                {activeEvent.titre && <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>{activeEvent.titre}</h1>}
                {activeEvent.description && <p style={{ fontSize: '1.5rem', marginBottom: '3rem', maxWidth: '600px' }}>{activeEvent.description}</p>}
                
                <button 
                    onClick={() => navigate('/menu')}
                    style={{
                        padding: '1rem 2rem',
                        fontSize: '1.2rem',
                        backgroundColor: activeEvent.couleur_secondaire || '#333333',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                >
                    Découvrir le menu
                </button>
            </div>
        );
    }

    return (
        <div className="p-4" style={{ textAlign: 'center', marginTop: '50px' }}>
            {error ? (
                <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>
            ) : (
                <p>Chargement de votre session...</p>
            )}
        </div>
    );
}
