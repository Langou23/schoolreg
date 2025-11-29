// Script pour créer un compte admin
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@schoolreg.com' }
    });

    if (existingAdmin) {
      console.log('✅ Admin existe déjà:', existingAdmin.email);
      console.log('   Email:', existingAdmin.email);
      console.log('   Nom:', existingAdmin.fullName);
      console.log('   Rôle:', existingAdmin.role);
      return;
    }

    // Créer l'admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@schoolreg.com',
        password: hashedPassword,
        fullName: 'Administrateur Principal',
        role: 'admin',
      }
    });

    console.log('✅ Admin créé avec succès!');
    console.log('   Email:', admin.email);
    console.log('   Mot de passe: admin123');
    console.log('   Nom:', admin.fullName);
    console.log('   Rôle:', admin.role);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
