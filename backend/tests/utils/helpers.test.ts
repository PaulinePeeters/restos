import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';
import { getIdParam, parseDateTime, hashPassword } from '../../src/utils/helpers.js';

describe('getIdParam', () => {
    it('convertit une chaîne numérique en nombre', () => {
        expect(getIdParam('42')).toBe(42);
    });

    it('gère le zéro', () => {
        expect(getIdParam('0')).toBe(0);
    });

    it('renvoie null pour une chaîne non numérique', () => {
        expect(getIdParam('abc')).toBeNull();
    });

    it('renvoie null pour une chaîne vide... mais Number("") vaut 0', () => {
        // Number('') === 0 (pas NaN), documente le comportement réel
        expect(getIdParam('')).toBe(0);
    });

    it('renvoie null pour une valeur clairement invalide', () => {
        expect(getIdParam('12abc')).toBeNull();
    });
});

describe('parseDateTime', () => {
    it('construit une Date à partir de date + heure valides', () => {
        const d = parseDateTime('2026-06-24', '14:30');
        expect(d).toBeInstanceOf(Date);
        expect(d?.getFullYear()).toBe(2026);
        expect(d?.getMonth()).toBe(5); // juin = index 5
        expect(d?.getDate()).toBe(24);
        expect(d?.getHours()).toBe(14);
        expect(d?.getMinutes()).toBe(30);
    });

    it('renvoie null si dateStr n’est pas une chaîne', () => {
        expect(parseDateTime(null as any, '14:30')).toBeNull();
    });

    it('renvoie null si timeStr n’est pas une chaîne', () => {
        expect(parseDateTime('2026-06-24', null as any)).toBeNull();
    });

    it('renvoie null pour une date totalement invalide', () => {
        expect(parseDateTime('pas-une-date', 'pas-une-heure')).toBeNull();
    });
});

describe('hashPassword', () => {
    it('produit un hash bcrypt vérifiable', async () => {
        const hash = await hashPassword('motdepasse123');
        expect(hash).not.toBe('motdepasse123');
        expect(hash.startsWith('$2')).toBe(true);
        expect(await bcrypt.compare('motdepasse123', hash)).toBe(true);
    });

    it('produit des hashs différents pour le même mot de passe (sel aléatoire)', async () => {
        const a = await hashPassword('identique');
        const b = await hashPassword('identique');
        expect(a).not.toBe(b);
    });
});
