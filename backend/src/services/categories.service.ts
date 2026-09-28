import { prisma } from '../db.js';
import type { tcategorieplat, Prisma } from '@prisma/client';

/** Catégorie avec ses enfants imbriqués */
interface CategoryTree extends tcategorieplat {
    children: CategoryTree[];
}

/**
 * Construit un arbre de catégories.
 */
function buildCategoryTree(categories: (tcategorieplat & { children: tcategorieplat[] })[]): CategoryTree[] {
    const lookup = new Map<number, CategoryTree>();
    const roots: CategoryTree[] = [];

    for (const cat of categories) {
        lookup.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of categories) {
        const node = lookup.get(cat.id)!;
        if (cat.parent_id === null) {
            roots.push(node);
        } else {
            const parent = lookup.get(cat.parent_id);
            if (parent) {
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        }
    }

    return roots;
}

/**
 * Récupère toutes les catégories sous forme d'arbre hiérarchique.
 */
export async function getAllCategoriesTree(): Promise<CategoryTree[]> {
    const categories = await prisma.tcategorieplat.findMany({
        where: { actif: true },
        include: { children: true },
        orderBy: { nom_categorie: 'asc' }
    });

    return buildCategoryTree(categories);
}

/**
 * Récupère toutes les catégories.
 */
export async function getAllCategories(): Promise<tcategorieplat[]> {
    return prisma.tcategorieplat.findMany({
        where: { actif: true },
        include: { children: true, parent: true },
        orderBy: { nom_categorie: 'asc' }
    });
}

/**
 * Crée une catégorie.
 */
export async function createCategory(
    nom_categorie: string,
    parent_id: number | string | null = null
): Promise<tcategorieplat> {
    return prisma.tcategorieplat.create({
        data: {
            nom_categorie,
            parent_id: parent_id ? Number(parent_id) : null
        }
    });
}

/**
 * Met à jour une catégorie.
 */
export async function updateCategory(
    id: number | string,
    data: Partial<{ nom_categorie: string; parent_id: number | null }>
): Promise<tcategorieplat> {
    const idNum = Number(id);

    if (data.parent_id !== undefined && data.parent_id !== null) {
        const parentIdNum = Number(data.parent_id);
        if (parentIdNum === idNum) {
            throw new Error("Une catégorie ne peut pas être son propre parent.");
        }
        data.parent_id = parentIdNum;
    }

    return prisma.tcategorieplat.update({
        where: { id: idNum },
        data
    });
}

/**
 * Désactive une catégorie.
 * Vérifie qu'elle n'a pas de sous-catégories actives ni de plats disponibles.
 */
export async function deleteCategory(id: number | string): Promise<tcategorieplat> {
    const idNum = Number(id);
    const category = await prisma.tcategorieplat.findUnique({
        where: { id: idNum },
        include: {
            _count: {
                select: {
                    children: { where: { actif: true } },
                    tplat: { where: { disponible: true } }
                }
            }
        }
    });

    if (!category) {
        throw new Error('Catégorie non trouvée.');
    }

    if (!category.actif) {
        throw new Error('Cette catégorie est déjà désactivée.');
    }

    if (category._count.children > 0) {
        throw new Error(`Impossible de désactiver : cette catégorie a ${category._count.children} sous-catégorie(s) active(s).`);
    }

    if (category._count.tplat > 0) {
        throw new Error(`Impossible de désactiver : cette catégorie contient ${category._count.tplat} plat(s) disponible(s).`);
    }

    return prisma.tcategorieplat.update({
        where: { id: idNum },
        data: { actif: false }
    });
}
