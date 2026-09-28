import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Start seeding ...');

    // 1. Nettoie la base de données
    await prisma.tplat_allergene.deleteMany();
    await prisma.tplat_ingredient.deleteMany();
    await prisma.tlignecommande.deleteMany();
    await prisma.tcommande.deleteMany();
    await prisma.tsessiontable.deleteMany();
    await prisma.ttableresto.deleteMany();
    await prisma.tplat.deleteMany();
    await prisma.tcategorieplat.deleteMany();
    await prisma.tpersonnel.deleteMany();
    await prisma.tallergene.deleteMany();
    await prisma.tingredient.deleteMany();
    await prisma.ttypeconge.deleteMany();

    // 2. Création des types de congé
    const typesConge = [
        { nom: "Vacances annuelles", deduit_solde_conges: true, est_recuperation: false },
        { nom: "Maladie", deduit_solde_conges: false, est_recuperation: false, requiert_justificatif: true },
        { nom: "Petit chômage", deduit_solde_conges: false, est_recuperation: false, requiert_justificatif: true },
        { nom: "Récupération", deduit_solde_conges: false, est_recuperation: true },
        { nom: "Congé sans solde", deduit_solde_conges: false, est_recuperation: false },
        { nom: "Congé éducation", deduit_solde_conges: false, est_recuperation: false, requiert_justificatif: true },
        { nom: "Maternité/Ecartement", deduit_solde_conges: false, est_recuperation: false, requiert_justificatif: true }
    ];

    for (const t of typesConge) {
        await prisma.ttypeconge.create({ data: t });
    }
    console.log('Created leave types');

    // 3. Création du manager
    const hashedPassword = await bcrypt.hash('password123', 10);
    const manager = await prisma.tpersonnel.create({
        data: {
            nom_personnel: 'Admin',
            prenom_personnel: 'Manager',
            email_personnel: 'admin@restos.com',
            mdp_personnel: hashedPassword,
            role_personnel: 'manager',
            actif: true,
        },
    });
    console.log('Created manager:', manager.email_personnel);

    // 3. Création des allergènes
    const allergenesList = [
        'Gluten', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja', 'Lait',
        'Fruits à coque', 'Céleri', 'Moutarde', 'Sésame', 'Sulfites', 'Lupin', 'Mollusques'
    ];

    const allergenesMap = {};
    for (const nom of allergenesList) {
        const allergene = await prisma.tallergene.create({
            data: { nom, icon: `${nom.toLowerCase()}.png` },
        });
        allergenesMap[nom] = allergene.id;
    }
    console.log('Created allergens');

    // 4. Création des catégories
    const categoriesData = [
        { id: 1, nom_categorie: 'Entrées' },
        { id: 2, nom_categorie: 'Plats' },
        { id: 3, nom_categorie: 'Desserts' },
        { id: 4, nom_categorie: 'Boissons' },
        // Sous-catégories pour Boissons
        { id: 5, nom_categorie: 'Vins', parent_id: 4 },
        { id: 6, nom_categorie: 'Softs', parent_id: 4 },
        { id: 7, nom_categorie: 'Bières', parent_id: 4 },
        { id: 8, nom_categorie: 'Cocktails', parent_id: 4 },
        { id: 9, nom_categorie: 'Boissons Chaudes', parent_id: 4 },
        // Sous-catégories pour Plats
        { id: 10, nom_categorie: 'Viandes', parent_id: 2 },
        { id: 11, nom_categorie: 'Poissons', parent_id: 2 },
        { id: 13, nom_categorie: 'Menu Enfants' },
    ];

    for (const cat of categoriesData) {
        await prisma.tcategorieplat.create({ data: cat });
    }
    console.log('Created categories');

    // 5. Création des ingrédients
    const ingredientsData = [
        { nom_ingredient: 'Farine', unite_ingredient: 'kg' },
        { nom_ingredient: 'Tomate', unite_ingredient: 'kg' },
        { nom_ingredient: 'Mozzarella', unite_ingredient: 'kg' },
        { nom_ingredient: 'Oeuf', unite_ingredient: 'pièce' },
        { nom_ingredient: 'Lait', unite_ingredient: 'L' },
        { nom_ingredient: 'Sucre', unite_ingredient: 'kg' },
        { nom_ingredient: 'Coca-Cola', unite_ingredient: 'canette' },
        { nom_ingredient: 'Vin Rouge', unite_ingredient: 'bouteille' },
        { nom_ingredient: 'Café', unite_ingredient: 'kg' },
    ];

    const ingredientsMap = {};
    for (const ing of ingredientsData) {
        const created = await prisma.tingredient.create({
            data: {
                ...ing,
                stock_actuel: 100,
                seuil_alerte: 10
            }
        });
        ingredientsMap[ing.nom_ingredient] = created.id;
    }
    console.log('Created ingredients and stock');

    // 6. Création des plats
    // Pizza Margherita (Plat)
    await prisma.tplat.create({
        data: {
            nom_plat: 'Pizza Margherita',
            description_plat: 'Tomate, Mozzarella, Basilic',
            prix_plat: 12.50,
            disponible: true,
            categorie_id: 2, // Plats
            vegetarien: true,
            tplat_ingredient: {
                create: [
                    { ingredient_id: ingredientsMap['Farine'], qt_utilisee: 0.2 },
                    { ingredient_id: ingredientsMap['Tomate'], qt_utilisee: 0.1 },
                    { ingredient_id: ingredientsMap['Mozzarella'], qt_utilisee: 0.1 },
                ]
            },
            tplat_allergene: {
                create: [
                    { allergene_id: allergenesMap['Gluten'] },
                    { allergene_id: allergenesMap['Lait'] },
                ]
            }
        }
    });

    // Mousse au Chocolat (Dessert)
    await prisma.tplat.create({
        data: {
            nom_plat: 'Mousse au Chocolat',
            description_plat: 'Chocolat noir, oeufs frais',
            prix_plat: 6.00,
            disponible: true,
            categorie_id: 3,
            tplat_ingredient: {
                create: [
                    { ingredient_id: ingredientsMap['Oeuf'], qt_utilisee: 2 },
                    { ingredient_id: ingredientsMap['Sucre'], qt_utilisee: 0.05 },
                ]
            },
            tplat_allergene: {
                create: [
                    { allergene_id: allergenesMap['Œufs'] },
                    { allergene_id: allergenesMap['Lait'] }, 
                ]
            }
        }
    });

    // Entrecôte (Plat -> Viandes)
    await prisma.tplat.create({
        data: {
            nom_plat: 'Entrecôte Grillée',
            description_plat: '300g, sauce au choix',
            prix_plat: 24.00,
            disponible: true,
            peut_choisir_cuisson: true,
            categorie_id: 10, // Viandes
            tplat_ingredient: {
                create: [
                ]
            }
        }
    });

    // Boissons
    await prisma.tplat.create({
        data: {
            nom_plat: 'Coca-Cola',
            description_plat: '33cl',
            prix_plat: 3.00,
            disponible: true,
            categorie_id: 6, // Softs
        }
    });

    await prisma.tplat.create({
        data: {
            nom_plat: 'Blonde Pression',
            description_plat: 'Bière locale artisanale',
            prix_plat: 4.00,
            disponible: true,
            categorie_id: 7, // Bières
            tplat_format: {
                create: [
                    { nom_format: '25cl', prix: 4.00 },
                    { nom_format: '33cl', prix: 5.50 }
                ]
            }
        }
    });

    await prisma.tplat.create({
        data: {
            nom_plat: 'Vin Rouge Maison',
            description_plat: 'Verre 15cl',
            prix_plat: 5.00,
            disponible: true,
            categorie_id: 5, // Vins
            tplat_allergene: {
                create: [
                    { allergene_id: allergenesMap['Sulfites'] },
                ]
            },
            tplat_format: {
                create: [
                    { nom_format: 'Verre (15cl)', prix: 5.00 },
                    { nom_format: 'Pichet (50cl)', prix: 14.00 },
                    { nom_format: 'Bouteille (75cl)', prix: 22.00 }
                ]
            }
        }
    });

    await prisma.tplat.create({
        data: {
            nom_plat: 'Mojito',
            description_plat: 'Rhum, Menthe, Citron vert',
            prix_plat: 9.00,
            disponible: true,
            categorie_id: 8, // Cocktails
        }
    });

    await prisma.tplat.create({
        data: {
            nom_plat: 'Espresso',
            description_plat: 'Café noir intense',
            prix_plat: 2.50,
            disponible: true,
            categorie_id: 9, // Boissons Chaudes
            tplat_ingredient: {
                create: [
                    { ingredient_id: ingredientsMap['Café'], qt_utilisee: 0.01 },
                ]
            }
        }
    });

    await prisma.tplat.create({
        data: {
            nom_plat: 'Nuggets & Frites',
            description_plat: 'Nuggets de poulet maison, frites fraîches',
            prix_plat: 9.00,
            disponible: true,
            categorie_id: 13, // Menu Enfants
            tplat_ingredient: {
                create: [
                ]
            },
            tplat_allergene: {
                create: [
                    { allergene_id: allergenesMap['Gluten'] },
                    { allergene_id: allergenesMap['Œufs'] },
                ]
            }
        }
    });

    // Tartare de Bœuf (Entrée ou Plat)
    await prisma.tplat.create({
        data: {
            nom_plat: 'Tartare de Bœuf',
            description_plat: 'Câpres, échalotes, persil, jaune d\'oeuf',
            prix_plat: 18.00, // Prix par défaut (Plat)
            disponible: true,
            categorie_id: 10, // Viandes
            tplat_ingredient: {
                create: [
                ]
            },
            tplat_format: {
                create: [
                    { nom_format: 'Entrée', prix: 12.00 },
                    { nom_format: 'Plat', prix: 18.00 }
                ]
            }
        }
    });
    console.log('Created dishes');

    // 7. Création des tables
    const tablesData = [
        { numero_table: 'T1', capacite_table: 4, pos_x: 0, pos_y: 0 },
        { numero_table: 'T2', capacite_table: 2, pos_x: 1, pos_y: 0 },
        { numero_table: 'T3', capacite_table: 4, pos_x: 0, pos_y: 1 },
        { numero_table: 'T4', capacite_table: 6, pos_x: 1, pos_y: 1 },
    ];

    for (const table of tablesData) {
        await prisma.ttableresto.create({ data: table });
    }
    console.log('Created tables');

    // 8. Création de la configuration par défaut
    const defaultConfigs = [
        { cle: 'ACCES_PMR', valeur: 'false', description: 'Accès pour personnes à mobilité réduite' },
        { cle: 'PARKING_DISPONIBLE', valeur: 'false', description: 'Parking disponible pour les clients' },
        { cle: 'TERRASSE', valeur: 'false', description: 'Terrasse extérieure' },
        { cle: 'CLIMATISATION', valeur: 'false', description: 'Salle climatisée' },
        { cle: 'WIFI_GRATUIT', valeur: 'false', description: 'Wifi gratuit pour les clients' },
        { cle: 'RESTAURANT_NOM', valeur: 'Déclinaison', description: 'Nom du restaurant' },
        { cle: 'RESTAURANT_ADRESSE', valeur: 'Place du Grand Sablon 15, 1000 Bruxelles', description: 'Adresse complète' },
        { cle: 'RESTAURANT_TELEPHONE', valeur: '+32 2 555 12 34', description: 'Numéro de téléphone' },
        { cle: 'RESTAURANT_EMAIL', valeur: 'contact@declinaison.be', description: 'Email de contact' },
        { cle: 'THEME_ACTIF', valeur: 'light', description: 'Thème de l\'interface' },
    ];
    
    for (const conf of defaultConfigs) {
        await prisma.tconfiguration.upsert({
            where: { cle: conf.cle },
            update: {},
            create: conf
        });
    }
    console.log('Created default configuration');

    console.log('Seeding finished.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
