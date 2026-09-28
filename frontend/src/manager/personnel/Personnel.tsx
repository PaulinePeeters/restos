import React, { useState } from 'react';
import styles from './Personnel.module.css';
import Planning from './Planning';
import Absences from './Absences';
import Membres from './Membres';
import Shifts from './Shifts';
import Button from '../../components/ui/Button';

type Onglet = 'planning' | 'absences' | 'membres' | 'shifts';

function Personnel() {
    const [onglet, setOnglet] = useState<Onglet>('planning');

    const renderContent = () => {
        switch (onglet) {
            case 'planning':
                return <Planning />;
            case 'absences':
                return <Absences />;
            case 'membres':
                return <Membres />;
            case 'shifts':
                return <Shifts />;
            default:
                return <Planning />;
        }
    };

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Gestion du Personnel</h2>
                <p className="page-subtitle">Gérez les plannings, absences et profils de votre équipe.</p>
            </div>
            <div className={styles.tabs}>
                <Button
                    onClick={() => setOnglet('planning')}
                    variant={onglet === 'planning' ? 'primary' : 'outline'}
                >
                    Planning
                </Button>
                <Button
                    onClick={() => setOnglet('absences')}
                    variant={onglet === 'absences' ? 'primary' : 'outline'}
                >
                    Absences
                </Button>
                <Button
                    onClick={() => setOnglet('membres')}
                    variant={onglet === 'membres' ? 'primary' : 'outline'}
                >
                    Membres
                </Button>
                <Button
                    onClick={() => setOnglet('shifts')}
                    variant={onglet === 'shifts' ? 'primary' : 'outline'}
                >
                    Gestion des Shifts
                </Button>
            </div>

            <div className={styles['personnel-content']}>
                {renderContent()}
            </div>
        </div>
    );
}

export default Personnel;
