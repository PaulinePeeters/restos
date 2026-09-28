import { prisma } from './src/db.js';
async function main() {
  const plat = await prisma.tplat.findFirst({ where: { nom_plat: { contains: 'Tartare' } }, include: { tplat_format: true } });
  console.log(JSON.stringify(plat, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
