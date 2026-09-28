import { prisma } from '../db.js';

/**
 * Génère une liste de courses automatique basée sur les seuils d'alerte.
 * Récupère tous les ingrédients dont le stock actuel est inférieur ou égal au seuil d'alerte.
 * 
 * @returns {Promise<Array<{ingredient_id: number, nom: string, stock_actuel: number, seuil: number, unite: string, cout_unitaire: number, quantite_a_commander: number}>>} La liste des ingrédients à commander.
 */
export async function generateShoppingList() {
    const allIngredients = await prisma.tingredient.findMany();

    const ingredientsToOrder = allIngredients.filter(ing =>
        Number(ing.stock_actuel) <= Number(ing.seuil_alerte)
    );

    return ingredientsToOrder.map(ing => ({
        ingredient_id: ing.id,
        nom: ing.nom_ingredient,
        stock_actuel: Number(ing.stock_actuel),
        seuil: Number(ing.seuil_alerte),
        unite: ing.unite_ingredient,
        cout_unitaire: Number(ing.cout_unitaire),
        quantite_a_commander: Math.max(0, Number(ing.seuil_alerte) * 2 - Number(ing.stock_actuel))
    }));
}

/**
 * Calcule les coûts détaillés (Food Cost) et la marge pour un plat spécifique.
 */
export async function calculateFoodCost(platId: number | string) {
    const plat = await prisma.tplat.findUnique({
        where: { id: Number(platId) },
        include: {
            tplat_ingredient: {
                include: { tingredient: true }
            }
        }
    });

    if (!plat) throw new Error("Plat non trouvé");

    let coutMatiereTotal = 0;
    const details: any[] = [];

    // Calcul du coût global des ingrédients
    for (const item of plat.tplat_ingredient) {
        if (item.tingredient) {
            const coutIngredient = Number(item.tingredient.cout_unitaire) * Number(item.qt_utilisee);
            coutMatiereTotal += coutIngredient;

            details.push({
                ingredient: item.tingredient.nom_ingredient,
                quantite: Number(item.qt_utilisee),
                unite: item.tingredient.unite_ingredient,
                cout_unitaire: Number(item.tingredient.cout_unitaire),
                cout_total_ingredient: Number(coutIngredient.toFixed(4))
            });
        }
    }

    const prixVente = Number(plat.prix_plat);
    const margeBrute = prixVente - coutMatiereTotal;

    // Taux de marge = (Marge / Prix de Vente) * 100
    const tauxMarge = prixVente > 0 ? (margeBrute / prixVente) * 100 : 0;

    // Ratio Coût Matière = (Coût Matière / Prix de Vente) * 100
    const ratioMatiere = prixVente > 0 ? (coutMatiereTotal / prixVente) * 100 : 0;

    return {
        plat: plat.nom_plat,
        prixVente: Number(prixVente.toFixed(2)),
        coutMatiere: Number(coutMatiereTotal.toFixed(2)),
        margeBrute: Number(margeBrute.toFixed(2)),
        tauxMarge: Number(tauxMarge.toFixed(2)),
        ratioMatiere: Number(ratioMatiere.toFixed(2)),
        details
    };
}

/**
 * Met à jour le coût unitaire d'un ingrédient.
 */
export async function updateIngredientCost(ingredientId: number | string, cout: number) {
    return prisma.tingredient.update({
        where: { id: Number(ingredientId) },
        data: { cout_unitaire: cout }
    });
}

