import { prisma } from '../db.js';
import type { tconfiguration } from '@prisma/client';

/**
 * Clés de configuration.
 */
export const CONFIG_KEYS = {
    TVA_RATE: 'TVA_RATE',
    DELIVERY_FEE: 'DELIVERY_FEE',
    MIN_ORDER_DELIVERY: 'MIN_ORDER_DELIVERY',
    POINTS_PER_EURO: 'POINTS_PER_EURO',
    POINTS_THRESHOLD: 'POINTS_THRESHOLD',
    RESTAURANT_NAME: 'RESTAURANT_NAME',
    RESTAURANT_ADDRESS: 'RESTAURANT_ADDRESS',
    RESTAURANT_PHONE: 'RESTAURANT_PHONE',
    OPENING_HOURS: 'OPENING_HOURS',
    GOOGLE_MAPS_URL: 'GOOGLE_MAPS_URL'
} as const;

export type ConfigKey = typeof CONFIG_KEYS[keyof typeof CONFIG_KEYS];

/** Cache mémoire pour les configurations fréquemment accédées */
const configCache = new Map<string, { value: string; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Récupère une valeur de configuration.
 */
export async function getConfig(cle: string): Promise<string | null> {
    const cached = configCache.get(cle);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.value;
    }

    const config = await prisma.tconfiguration.findUnique({
        where: { cle }
    });

    if (config && config.valeur !== null) {
        configCache.set(cle, { value: config.valeur, timestamp: Date.now() });
        return config.valeur;
    }

    return null;
}

/**
 * Récupère une configuration numérique.
 */
export async function getConfigNumber(cle: string, defaultValue = 0): Promise<number> {
    const value = await getConfig(cle);
    if (value === null) return defaultValue;

    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Récupère une configuration booléenne.
 */
export async function getConfigBoolean(cle: string, defaultValue = false): Promise<boolean> {
    const value = await getConfig(cle);
    if (value === null) return defaultValue;

    return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Met à jour une configuration.
 */
export async function updateConfig(cle: string, valeur: string): Promise<tconfiguration> {
    configCache.delete(cle);

    return prisma.tconfiguration.upsert({
        where: { cle },
        update: { valeur },
        create: { cle, valeur }
    });
}

/**
 * Récupère toutes les configurations.
 */
export async function getAllConfig(): Promise<tconfiguration[]> {
    return prisma.tconfiguration.findMany();
}

/**
 * Récupère toutes les configurations sous forme d'objet { cle: valeur }.
 */
export async function getAllConfigAsMap(): Promise<Record<string, string>> {
    const configs = await prisma.tconfiguration.findMany();
    return configs.reduce((acc, config) => {
        acc[config.cle] = config.valeur ?? '';
        return acc;
    }, {} as Record<string, string>);
}

/**
 * Met à jour plusieurs configurations en une transaction.
 */
export async function updateConfigs(configs: { cle: string; valeur: string }[]): Promise<tconfiguration[]> {
    configs.forEach(c => configCache.delete(c.cle));

    const operations = configs.map(config =>
        prisma.tconfiguration.upsert({
            where: { cle: config.cle },
            update: { valeur: config.valeur },
            create: { cle: config.cle, valeur: config.valeur }
        })
    );
    return prisma.$transaction(operations);
}

/**
 * Invalide le cache de configuration.
 */
export function invalidateConfigCache(cle?: string): void {
    if (cle) {
        configCache.delete(cle);
    } else {
        configCache.clear();
    }
}

// === Helpers pour configurations critiques ===

/**
 * Récupère le taux de TVA (défaut: 21%).
 */
export async function getTvaRate(): Promise<number> {
    return getConfigNumber(CONFIG_KEYS.TVA_RATE, 21);
}

/**
 * Récupère les frais de livraison (défaut: 2.50€).
 */
export async function getDeliveryFee(): Promise<number> {
    return getConfigNumber(CONFIG_KEYS.DELIVERY_FEE, 2.50);
}

/**
 * Récupère le minimum de commande pour la livraison (défaut: 15€).
 */
export async function getMinOrderDelivery(): Promise<number> {
    return getConfigNumber(CONFIG_KEYS.MIN_ORDER_DELIVERY, 15);
}
