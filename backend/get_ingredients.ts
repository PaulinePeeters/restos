import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const ingredients = await prisma.tingredient.findMany();
    console.log(ingredients.map(i => `${i.id}: ${i.nom_ingredient} (${i.unite_ingredient})`).join('\n'));
}
main().catch(console.error).finally(() => prisma.$disconnect());
