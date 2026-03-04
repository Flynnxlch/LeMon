import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// FIX [F001][F002]: Use env for initial admin; never log password. Prefer SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in production.
const DEFAULT_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || ''; //Isi disini
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || ''; // Override via env in production; change after first login

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });
  if (existing) {
    console.log('Admin Pusat already exists:', DEFAULT_ADMIN_EMAIL);
    return;
  }
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: {
      name: 'Admin Pusat 2',
      email: DEFAULT_ADMIN_EMAIL,
      password: passwordHash,
      role: 'Admin Pusat',
      branchId: null,
      status: 'Active',
    },
  });
  // FIX [F001]: Do not log password; log only that admin was created and remind to change password
  console.log('Admin Pusat created:', DEFAULT_ADMIN_EMAIL);
  console.log('Please change the password after first login.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
