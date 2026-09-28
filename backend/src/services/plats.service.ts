import { prisma } from '../db.js';
import { Prisma, type tplat } from '@prisma/client';

/**
 * Interface pour la création d'un plat
 */
interface CreatePlatData {
    nom: string;
    nom_en?: string;
    nom_nl?: string;
    description?: string;
    description_en?: string;
    description_nl?: string;
    image_url?: string;
    prix: number;
    disponible: boolean;
    categorie_id: number | string;
    vegan?: boolean;
    vegetarien?: boolean;
    peut_choisir_cuisson?: boolean;
    cuisson_possible?: boolean;
    allergenes?: number[];
    ingredients?: { ingredient_id: number; qt_utilisee: number }[];
    formats?: { nom: string; prix: number }[];
}

/**
 * Interface pour le plat avec coût de revient
 */

interface PlatWithDetails extends tplat {
    cout_revient?: number;
    marge_brute?: number;
    ratio_food_cost?: number;
    prix_suggere?: number;
}

/**
 * Calcule le coût de revient d'un plat basé sur ses ingrédients.
 */
function calculateCost(ingredients: any[]): number {
    if (!ingredients || ingredients.length === 0) return 0;

    return ingredients.reduce((total, item) => {
        const coutUnit = Number(item.tingredient?.cout_unitaire || 0);
        const qt = Number(item.qt_utilisee || 0);
        return total + (coutUnit * qt);
    }, 0);
}

/**
 * Ajoute un nouveau plat.
 */
export async function ajouterPlat(data: CreatePlatData) {
    const { nom, nom_en, nom_nl, description, description_en, description_nl, image_url, prix, disponible, categorie_id, vegan, vegetarien, peut_choisir_cuisson, cuisson_possible, allergenes = [], ingredients = [], formats = [] } = data;

    return prisma.tplat.create({
        data: {
            nom_plat: nom,
            nom_plat_en: nom_en || null,
            nom_plat_nl: nom_nl || null,
            description_plat: description || null,
            description_plat_en: description_en || null,
            description_plat_nl: description_nl || null,
            image_url: image_url || null,
            prix_plat: new Prisma.Decimal(prix),
            disponible,
            categorie_id: Number(categorie_id),
            vegan: vegan || false,
            vegetarien: vegetarien || false,
            peut_choisir_cuisson: peut_choisir_cuisson || cuisson_possible || false,
            tplat_allergene: {
                create: allergenes.map((allergeneId: number) => ({
                    allergene_id: allergeneId
                }))
            },
            tplat_ingredient: {
                create: ingredients.map((ing) => ({
                    ingredient_id: ing.ingredient_id,
                    qt_utilisee: new Prisma.Decimal(ing.qt_utilisee)
                }))
            },
            tplat_format: {
                create: formats.map((f) => ({
                    nom_format: f.nom,
                    prix: new Prisma.Decimal(f.prix)
                }))
            }
        },
        include: {
            tplat_allergene: { include: { tallergene: true } },
            tplat_ingredient: { include: { tingredient: true } },
            tcategorieplat: true,
            tplat_format: true
        }
    });
}

/**
 * Récupère tous les plats avec calcul de rentabilité.
 */
export async function getAllPlats() {
    const plats = await prisma.tplat.findMany({
        orderBy: { nom_plat: 'asc' },
        include: {
            tplat_allergene: { include: { tallergene: true } },
            tplat_ingredient: { include: { tingredient: true } },
            tcategorieplat: true,
            tplat_format: true
        }
    });

    return plats.map(plat => {
        const cout = calculateCost(plat.tplat_ingredient);
        const prixVente = Number(plat.prix_plat);
        let ratio = 0;

        if (prixVente > 0) {
            ratio = (cout / prixVente) * 100;
        }

        // Prix suggéré pour atteindre 30% de food cost
        let prixSuggere = 0;
        if (cout > 0) {
            prixSuggere = cout / 0.30;
        }

        return {
            ...plat,
            cout_revient: Number(cout.toFixed(2)),
            marge_brute: Number((prixVente - cout).toFixed(2)),
            ratio_food_cost: Number(ratio.toFixed(1)),
            prix_suggere: Number(prixSuggere.toFixed(2))
        };
    });
}

/**
 * Supprime ou désactive un plat.
 * Si le plat a été commandé au moins une fois, il est désactivé
 * pour préserver l'historique des commandes et la comptabilité.
 * Sinon, il est supprimé physiquement.
 */
export async function supprimerPlat(id: number | string) {
    const idNum = Number(id);

    const commandeCount = await prisma.tlignecommande.count({
        where: { plat_id: idNum }
    });

    if (commandeCount > 0) {
        return prisma.tplat.update({
            where: { id: idNum },
            data: { disponible: false }
        });
    }

    return prisma.$transaction(async (tx) => {
        await tx.tplat_allergene.deleteMany({ where: { plat_id: idNum } });
        await tx.tplat_ingredient.deleteMany({ where: { plat_id: idNum } });
        await tx.tplat_format.deleteMany({ where: { plat_id: idNum } });
        return tx.tplat.delete({ where: { id: idNum } });
    });
}

/**
 * Modifie un plat existant.
 */
export async function modifierPlat(id: number | string, data: Partial<CreatePlatData>) {
    const idNum = Number(id);
    const { nom, nom_en, nom_nl, description, description_en, description_nl, image_url, prix, disponible, categorie_id, vegan, vegetarien, peut_choisir_cuisson, cuisson_possible, allergenes, ingredients, formats } = data;

    return prisma.$transaction(async (tx) => {

        if (allergenes !== undefined) {
            await tx.tplat_allergene.deleteMany({ where: { plat_id: idNum } });
        }
        if (ingredients !== undefined) {
            await tx.tplat_ingredient.deleteMany({ where: { plat_id: idNum } });
        }
        if (formats !== undefined) {
            await tx.tplat_format.deleteMany({ where: { plat_id: idNum } });
        }

        const updateData: any = {};

        if (nom !== undefined) updateData.nom_plat = nom;
        if (nom_en !== undefined) updateData.nom_plat_en = nom_en || null;
        if (nom_nl !== undefined) updateData.nom_plat_nl = nom_nl || null;
        if (description !== undefined) updateData.description_plat = description || null;
        if (description_en !== undefined) updateData.description_plat_en = description_en || null;
        if (description_nl !== undefined) updateData.description_plat_nl = description_nl || null;
        if (prix !== undefined) updateData.prix_plat = new Prisma.Decimal(prix);
        if (disponible !== undefined) updateData.disponible = disponible;

        if (categorie_id !== undefined) {
            const catId = Number(categorie_id);
            if (!isNaN(catId)) {
                updateData.categorie_id = catId;
            }
        }

        if (vegan !== undefined) updateData.vegan = vegan;
        if (vegetarien !== undefined) updateData.vegetarien = vegetarien;
        if (peut_choisir_cuisson !== undefined) updateData.peut_choisir_cuisson = peut_choisir_cuisson;
        else if (cuisson_possible !== undefined) updateData.peut_choisir_cuisson = cuisson_possible;

        if (image_url !== undefined) {
            updateData.image_url = image_url;
        }

        // Mise à jour des relations UNIQUEMENT si fournies
        if (allergenes !== undefined && Array.isArray(allergenes)) {
            updateData.tplat_allergene = {
                create: allergenes.map((allergeneId: number) => ({
                    allergene_id: allergeneId
                }))
            };
        }

        if (ingredients !== undefined && Array.isArray(ingredients)) {
            updateData.tplat_ingredient = {
                create: ingredients.map((ing) => ({
                    ingredient_id: ing.ingredient_id,
                    qt_utilisee: new Prisma.Decimal(ing.qt_utilisee)
                }))
            };
        }

        if (formats !== undefined && Array.isArray(formats)) {
            updateData.tplat_format = {
                create: formats.map((f) => ({
                    nom_format: f.nom,
                    prix: new Prisma.Decimal(f.prix)
                }))
            };
        }

        return tx.tplat.update({
            where: { id: idNum },
            data: updateData,
            include: {
                tplat_allergene: { include: { tallergene: true } },
                tplat_ingredient: { include: { tingredient: true } },
                tcategorieplat: true,
                tplat_format: true
            }
        });
    });
}
