import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing database connection...');
    const count = await prisma.systemMenu.count();
    console.log('Total menus:', count);

    const headerMenus = await prisma.systemMenu.findMany({
      where: { enabled: true, location: 'header' },
    });
    console.log('Header menus:', headerMenus.length);
    headerMenus.forEach(m => console.log(`  - ${m.name} (${m.location})`));

    const sidebarMenus = await prisma.systemMenu.findMany({
      where: { enabled: true, location: 'sidebar' },
    });
    console.log('Sidebar menus:', sidebarMenus.length);
    sidebarMenus.forEach(m => console.log(`  - ${m.name} (${m.location})`));
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();