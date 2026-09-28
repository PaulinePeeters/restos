import { prisma } from '../db.js';
import type { tingredient, Prisma } from '@prisma/client';

/**
 * Interface de création d'ingrédient
 */
interface CreateIngredientData {
    nom_ingredient: string;
    unite_ingredient: string;
    cout_unitaire: number;
    stock_actuel: number;
    seuil_alerte: number;
}

/**
 * Interface enrichie pour le dashboard stock
 */
interface IngredientWithValuation extends tingredient {
    valeur_stock: number;
}

/**
 * Valide les données d'ingrédient.
 */
function validateIngredientData(data: Partial<CreateIngredientData>) {
    if (data.stock_actuel !== undefined && data.stock_actuel < 0) {
        throw new Error("Le stock actuel ne peut pas être négatif.");
    }
    if (data.cout_unitaire !== undefined && data.cout_unitaire < 0) {
        throw new Error("Le coût unitaire ne peut pas être négatif.");
    }
}

/**
 * Récupère tous les ingrédients avec leur valeur de stock calculée.
 */
export async function getAllIngredients(): Promise<IngredientWithValuation[]> {
    const ingredients = await prisma.tingredient.findMany({
        orderBy: { nom_ingredient: 'asc' },
    });

    return ingredients.map(ing => ({
        ...ing,
        valeur_stock: Number(ing.stock_actuel) * Number(ing.cout_unitaire)
    }));
}

/**
 * Récupère les ingrédients en alerte (stock <= seuil).
 */
export async function getLowStockIngredients(): Promise<tingredient[]> {
    return prisma.tingredient.findMany({
        where: {
            stock_actuel: {
                lte: prisma.tingredient.fields.seuil_alerte
            }
        }
    });
}

/**
 * Récupère la valeur totale du stock.
 */
export async function getTotalStockValue(): Promise<number> {
    const ingredients = await getAllIngredients();
    return ingredients.reduce((total, ing) => total + ing.valeur_stock, 0);
}

/**
 * Récupère un ingrédient par son ID.
 */
export async function getIngredientById(id: number | string): Promise<tingredient | null> {
    return prisma.tingredient.findUnique({
        where: { id: Number(id) },
    });
}

/**
 * Crée un nouvel ingrédient.
 */
export async function createIngredient(data: CreateIngredientData): Promise<tingredient> {
    validateIngredientData(data);

    return prisma.tingredient.create({
        data: {
            nom_ingredient: data.nom_ingredient,
            unite_ingredient: data.unite_ingredient,
            cout_unitaire: data.cout_unitaire,
            stock_actuel: data.stock_actuel,
            seuil_alerte: data.seuil_alerte
        },
    });
}

/**
 * Met à jour un ingrédient existant.
 */
export async function updateIngredient(
    id: number | string,
    data: Prisma.tingredientUpdateInput
): Promise<tingredient> {

    const validationData: Partial<CreateIngredientData> = {};
    if (typeof data.stock_actuel === 'number') validationData.stock_actuel = data.stock_actuel;
    if (typeof data.cout_unitaire === 'number') validationData.cout_unitaire = data.cout_unitaire;

    validateIngredientData(validationData);

    return prisma.tingredient.update({
        where: { id: Number(id) },
        data,
    });
}

/**
 * Supprime un ingrédient.
 */
export async function deleteIngredient(id: number | string): Promise<tingredient> {
    try {
        return await prisma.tingredient.delete({
            where: { id: Number(id) },
        });
    } catch (error: any) {
        if (error.code === 'P2003') {
            throw new Error("Impossible de supprimer cet ingrédient car il est utilisé dans un ou plusieurs plats.");
        }
        throw error;
    }
}
