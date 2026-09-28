import React from 'react';
import styles from './Card.module.css';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    className?: string;
    footer?: React.ReactNode;
    style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({
    children,
    title,
    className = '',
    footer,
    style = {}
}) => {
    return (
        <div className={`${styles.card} ${className}`} style={style}>
            {title && (
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{title}</h3>
                </div>
            )}
            <div className={styles.cardBody}>
                {children}
            </div>
            {footer && (
                <div className={styles.cardFooter}>
                    {footer}
                </div>
            )}
        </div>
    );
};

export default Card;
