import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Get the lab
  const lab = await prisma.lab.findFirst();
  if (!lab) {
    console.error('No lab found. Run the main seed first.');
    process.exit(1);
  }

  // Check if default template already exists
  const existing = await prisma.reportTemplate.findFirst({
    where: { labId: lab.id, isDefault: true },
  });

  if (existing) {
    console.log('Default template already exists:', existing.name);
    return;
  }

  const template = await prisma.reportTemplate.create({
    data: {
      name: 'Standard COA',
      headerText: 'An ISO/IEC 17025:2017 Accredited Laboratory\nEmirates National Accreditation System (ENAS)',
      footerText: 'The test Report shall not be reproduced (except in full) without the written approval of SPECTRUM. When analysis is witnessed by us or carried out by sub contract labs, our responsibility is solely to ensure that the analysis is conducted to standard test methods in accordance with industry accepted practice. We are not responsible for apparatus, instrumentation and measuring devices, their calibration or working order, reagents and solutions are accepted as prepared.',
      showLabLogo: true,
      isDefault: true,
      labId: lab.id,
    },
  });

  console.log('Created default report template:', template.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
