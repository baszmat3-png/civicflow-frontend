import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function restoreUserPasswords() {
  console.log('🔄 Restoring user accounts and resetting passwords to CivicFlow@Secure2026...');

  const passwordHash = await bcrypt.hash('CivicFlow@Secure2026', 10);

  const emails = [
    'alzmat66@gmail.com',
    'alzmat99@gmail.com',
    'baszmat3@gmail.com',
    'mbas89077@gmail.com'
  ];

  for (const email of emails) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          emailVerified: true
        }
      });
      console.log(`✅ Updated password for: ${email}`);
    } else {
      console.log(`ℹ️ User not found in DB: ${email}`);
    }
  }

  // Clear all refresh tokens so fresh logins succeed cleanly
  await prisma.refreshToken.deleteMany({});
  console.log('✅ Cleared old refresh tokens.');
  console.log('🎉 Password restoration completed successfully!');
}

restoreUserPasswords()
  .catch((err) => {
    console.error('❌ Error restoring passwords:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
