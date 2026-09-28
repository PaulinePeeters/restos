import React from 'react';

interface BannerProps {
    theme?: string;
    activeEvent?: any;
}

const Banner: React.FC<BannerProps> = ({ theme, activeEvent }) => {
    if ((!theme || theme === 'DEFAUT') && !(activeEvent && activeEvent.format === 'BANNIERE')) return null;

    const styles: { [key: string]: React.CSSProperties } = {
        container: {
            width: '100%',
            padding: '1rem',
            textAlign: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            position: 'relative',
            overflow: 'hidden'
        },
        noel: {
            backgroundColor: '#d32f2f',
            backgroundImage: 'linear-gradient(45deg, #d32f2f 25%, #b71c1c 25%, #b71c1c 50%, #d32f2f 50%, #d32f2f 75%, #b71c1c 75%, #b71c1c 100%)',
            backgroundSize: '40px 40px'
        },
        valentin: {
            backgroundColor: '#e91e63',
            backgroundImage: 'radial-gradient(circle, #f48fb1 10%, transparent 10%)',
            backgroundSize: '20px 20px'
        }
    };

    let content: React.ReactNode = null;
    let style: React.CSSProperties = {};

    // Banniere personnalisée
    if (activeEvent && activeEvent.format === 'BANNIERE') {
        const bgOpacity = activeEvent.opacity !== undefined ? activeEvent.opacity : 1;
        
        style = {
            ...styles.container,
            backgroundColor: activeEvent.couleur_principale || '#ffffff',
            color: activeEvent.couleur_texte || '#000000',
            fontFamily: activeEvent.font || 'inherit',
            textAlign: (activeEvent.text_align || 'center') as any,
            backgroundImage: activeEvent.image_url ? `linear-gradient(rgba(0,0,0,${bgOpacity}), rgba(0,0,0,${bgOpacity})), url(${activeEvent.image_url})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '100px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
        };

        content = (
            <div>
                {activeEvent.titre && <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{activeEvent.titre}</h2>}
                {activeEvent.description && <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem' }}>{activeEvent.description}</p>}
            </div>
        );
    } else {
        if (!theme || theme === 'DEFAUT') return null;

        switch (theme) {
            case 'NOEL':
                style = { ...styles.container, ...styles.noel };
                content = (
                    <div>
                        Joyeuses Fêtes ! Découvrez notre menu spécial Noël 
                    </div>
                );
                break;
            case 'VALENTIN':
                style = { ...styles.container, ...styles.valentin };
                content = (
                    <div>
                        Saint-Valentin : Réservez votre table romantique pour deux ! 
                    </div>
                );
                break;
            default:
                return null;
        }
    }

    return (
        <div style={style}>
            {content}
        </div>
    );
};

export default Banner;
