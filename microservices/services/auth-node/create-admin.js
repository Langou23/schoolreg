// Script pour créer un compte admin
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@schoolreg.com' }
    });

    if (existingAdmin) {
      console.log('✅ Admin existe déjà:');
      console.log('   Email:', existingAdmin.email);
      console.log('   Nom:', existingAdmin.fullName);
      console.log('   Rôle:', existingAdmin.role);
      console.log('\n📝 Identifiants de connexion:');
      console.log('   Email: admin@schoolreg.com');
      console.log('   Mot de passe: admin123');
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
