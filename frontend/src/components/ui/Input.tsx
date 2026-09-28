import React from 'react';
import styles from './Input.module.css';

interface InputProps {
    label?: string;
    type?: string;
    name?: string;
    value?: string | number;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    error?: string | null;
    className?: string;
    min?: string | number;
    max?: string | number;
    step?: string | number;
}

const Input: React.FC<InputProps> = ({
    label,
    type = 'text',
    name,
    value,
    onChange,
    placeholder = '',
    required = false,
    error = null,
    className = '',
    min,
    max,
    step
}) => {
    return (
        <div className={`${styles.inputWrapper} ${className}`}>
            {label && (
                <label className={styles.label}>
                    {label} {required && <span className={styles.required}>*</span>}
                </label>
            )}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                min={min}
                max={max}
                step={step}
                className={`${styles.input} ${error ? styles.hasError : ''}`}
            />
            {error && <span className={styles.errorMessage}>{error}</span>}
        </div>
    );
};

export default Input;
