import { logger } from '../utils/logger.js';
/**
 * Service de traduction utilisant l'API MyMemory.
 * Inclut un cache simple en mémoire pour limiter les appels API.
 */

const translationCache = new Map<string, string>();

/**
 * Nettoie le texte traduit en décodant les entités HTML courantes retournées par l'API.
 * @param {string} text - Le texte à nettoyer.
 * @returns {string} Le texte nettoyé.
 */
function decodeHtmlEntities(text: string): string {
    if (!text) return text;
    return text
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&eacute;/g, 'é')
        .replace(/&egrave;/g, 'è')
        .replace(/&ecirc;/g, 'ê')
        .replace(/&agrave;/g, 'à')
        .replace(/&ccedil;/g, 'ç')
        ;
}

/**
 * Traduit un texte d'une langue source vers une langue cible.
 * Utilise un cache pour éviter les requêtes répétées.
 * 
 * @param {string} text - Le texte à traduire.
 * @param {string} sourceLang - Code langue source.
 * @param {string} targetLang - Code langue cible.
 * @returns {Promise<string>} Le texte traduit ou le texte original en cas d'erreur.
 */
export async function translateText(text: string, sourceLang: string, targetLang: string) {
    if (!text) return '';

    const cacheKey = `${sourceLang}|${targetLang}|${text}`;

    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }

    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
        const response = await fetch(url);
        const data = await response.json() as any;

        if (data.responseStatus === 200) {
            let translatedText = data.responseData.translatedText;

            translatedText = decodeHtmlEntities(translatedText);

            // Mise en cache
            translationCache.set(cacheKey, translatedText);

            return translatedText;
        } else {
            logger.warn(`Translation API Warning (${data.responseStatus}): ${data.responseDetails}`);
            return text;
        }
    } catch (error) {
        logger.error('Translation Service Network/System Error:', error);
        return text;
    }
}

