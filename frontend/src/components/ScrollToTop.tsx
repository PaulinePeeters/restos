import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// remonte en haut de page lors d'un changement de route
export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
