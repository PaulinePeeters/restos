import React, { useState, useEffect } from 'react';
import Banner from './layout/Banner';
import api from '../services/api';

interface ThemeContextType {
    theme: string;
    activeEvent?: any;
}
// Context pour gérer le thème actif
export const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

interface ThemeManagerProps {
    children: React.ReactNode;
}

const ThemeManager: React.FC<ThemeManagerProps> = ({ children }) => {
    const [theme, setTheme] = useState<string>('DEFAUT');
    const [activeEvent, setActiveEvent] = useState<any>(null);

    useEffect(() => {
        const fetchTheme = async () => {
            try {
                const data: any = await api.get('/configuration/THEME_ACTIF');
                if (data && data.valeur) setTheme(data.valeur);
            } catch (err) {
                console.error(err);
                setTheme('DEFAUT');
            }
            
            try {
                const eventData: any = await api.get('/events/active');
                setActiveEvent(eventData || null);
            } catch (err) {
                console.error("Erreur chargement événement", err);
                setActiveEvent(null);
            }
        };
        fetchTheme();

        // polling pour détecter les changements de thème et d'événement actif
        const interval = setInterval(async () => {
            try {
                const data: any = await api.get('/configuration/THEME_ACTIF');
                if (data && data.valeur && data.valeur !== theme) setTheme(data.valeur);
            } catch (err) {
                console.error(err);
            }
            
            try {
                const eventData: any = await api.get('/events/active');
                setActiveEvent((prev: any) => {
                    if (!prev && !eventData) return prev;
                    if (!prev || !eventData || prev.id !== eventData.id) return eventData;
                    return prev; 
                });
            } catch (err) {
                console.error("Erreur polling événement", err);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, activeEvent }}>
            <Banner theme={theme} activeEvent={activeEvent} />
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeManager;
