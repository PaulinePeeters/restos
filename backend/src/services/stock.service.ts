import { prisma } from '../db.js';
import { notificationsService } from './notifications.service.js';

/**
 * Récupère la liste complète des stocks.
 */
export async function getAllStock() {
    return prisma.tingredient.findMany({
        orderBy: { nom_ingredient: 'asc' }
    });
}

/**
 * Récupère les détails du stock pour un ingrédient spécifique.
 */
export async function getStockByIngredientId(ingredientId: number | string) {
    return prisma.tingredient.findUnique({
        where: { id: Number(ingredientId) }
    });
}

/**
 * Met à jour la quantité disponible d'un ingrédient en stock.
 */
export async function updateStockQuantity(ingredientId: number | string, newQuantity: number) {
    return prisma.tingredient.update({
        where: { id: Number(ingredientId) },
        data: { stock_actuel: newQuantity },
    });
}

export const updateStock = updateStockQuantity;

/**
 * Définit le stock initial et le seuil d'alerte pour un ingrédient.
 */
export async function createStock(ingredientId: number, quantity: number, alertThreshold: number) {
    return prisma.tingredient.update({
        where: { id: ingredientId },
        data: {
            stock_actuel: quantity,
            seuil_alerte: alertThreshold
        }
    });
}

/**
 * "Supprime" le stock d'un ingrédient en le mettant à 0.
 */
export async function deleteStock(ingredientId: number) {
    return prisma.tingredient.update({
        where: { id: ingredientId },
        data: { stock_actuel: 0 }
    });
}

/**
 * Vérifie la disponibilité d'un plat en fonction des ingrédients en stock.
 * Calcule combien de portions peuvent être préparées.
 */
export async function checkDishAvailability(platId: number | string, tx?: any) {
    const db = tx || prisma;
    const plat = await db.tplat.findUnique({
        where: { id: Number(platId) },
        include: { tplat_ingredient: { include: { tingredient: true } } }
    });

    if (!plat || !plat.tplat_ingredient.length) return 999;

    let minServings = 9999;

    for (const item of plat.tplat_ingredient) {
        const ingredient = item.tingredient;

        if (!ingredient) return 0;

        const stock = Number(ingredient.stock_actuel);
        const required = Number(item.qt_utilisee);

        if (required <= 0) continue;
        // Calcul du nombre de portions possibles
        const possible = Math.floor(stock / required);
        if (possible < minServings) minServings = possible;
    }

    return minServings === 9999 ? 0 : minServings;
}

/**
 * Déduit les ingrédients du stock pour un plat donné.
 * Met à jour le stock et détecte les alertes de stock bas.
 */
export async function deductIngredients(
    platId: number | string,
    quantity: number,
    tx?: any
) {
    const db = tx || prisma;

    const plat = await db.tplat.findUnique({
        where: { id: Number(platId) },
        include: { tplat_ingredient: { include: { tingredient: true } } }
    });

    if (!plat) throw new Error("Plat introuvable");

    const alerts: string[] = [];
    const ingredientIds: number[] = [];

    for (const item of plat.tplat_ingredient) {
        const ingredient = item.tingredient;

        if (ingredient) {
            const decrementAmount = Number(item.qt_utilisee) * quantity;

            try {
                // Opération atomique : la BD gère la déduction
                const updatedIngredient = await db.tingredient.update({
                    where: { id: ingredient.id },
                    data: { stock_actuel: { decrement: decrementAmount } }
                });

                if (Number(updatedIngredient.stock_actuel) < Number(ingredient.seuil_alerte)) {
                    alerts.push(`${ingredient.nom_ingredient} (Reste: ${updatedIngredient.stock_actuel} ${ingredient.unite_ingredient})`);
                    ingredientIds.push(ingredient.id);
                }
            } catch (error: any) {
                // Si la BD renvoie une erreur
                throw new Error(`Stock insuffisant pour ${ingredient.nom_ingredient}`);
            }
        }
    }

    return { alerts, ingredientIds };
}

/**
 * Restitue les ingrédients au stock pour un plat donné (en cas d'annulation de commande).
 * Opération inverse de deductIngredients.
 */
export async function restoreIngredients(
    platId: number | string,
    quantity: number,
    tx?: any
) {
    const db = tx || prisma;

    const plat = await db.tplat.findUnique({
        where: { id: Number(platId) },
        include: { tplat_ingredient: { include: { tingredient: true } } }
    });

    if (!plat) return; // Plat supprimé entre-temps, on ne bloque pas l'annulation

    for (const item of plat.tplat_ingredient) {
        const ingredient = item.tingredient;
        if (ingredient) {
            const incrementAmount = Number(item.qt_utilisee) * quantity;
            await db.tingredient.update({
                where: { id: ingredient.id },
                data: { stock_actuel: { increment: incrementAmount } }
            });
        }
    }
}

/**
 * Émet les notifications de stock bas.
 */
export async function emitStockAlerts(alerts: string[], ingredientIds: number[]) {
    for (let i = 0; i < alerts.length && i < ingredientIds.length; i++) {
        const ingredientId = ingredientIds[i];

        const platsImpactes = await prisma.tplat_ingredient.findMany({
            where: { ingredient_id: ingredientId },
            include: { tplat: true }
        });

        const platsNoms = platsImpactes.map(p => ({ id: p.tplat.id, nom: p.tplat.nom_plat }));

        await notificationsService.createNotification(
            'STOCK',
            `${alerts[i]}. Impacte ${platsNoms.length} plats.`,
            'manager',
            { ingredient_id: ingredientId, plats: platsNoms }
        );

        await notificationsService.createNotification(
            'STOCK',
            alerts[i],
            'cuisinier'
        );
    }
}

