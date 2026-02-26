import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { hashSync } from 'bcryptjs';

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Spectrum LIMS database...');

  // ============================================================
  // Clean existing data (in reverse dependency order)
  // ============================================================
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.reportVerification.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.report.deleteMany(),
    prisma.reportTemplate.deleteMany(),
    prisma.testResult.deleteMany(),
    prisma.sample.deleteMany(),
    prisma.formatID.deleteMany(),
    prisma.sampleType.deleteMany(),
    prisma.portalUser.deleteMany(),
    prisma.contactPerson.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.user.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.role.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.lab.deleteMany(),
  ]);

  console.log('Cleared existing data.');

  // ============================================================
  // 1. Lab
  // ============================================================
  const lab = await prisma.lab.create({
    data: {
      name: 'Spectrum Testing & Inspection',
      code: 'SPEC',
      address: 'Ajman, UAE',
      phone: '+971 6 7444718',
      email: 'info@speclabuae.com',
    },
  });
  console.log('Created lab:', lab.name);

  // ============================================================
  // 2. Permissions (6 modules × 4 actions = 24)
  // ============================================================
  const modules = ['dashboard', 'masters', 'process', 'accounts', 'reports', 'admin'];
  const actions = ['view', 'create', 'edit', 'delete'];

  const permissionRecords: Record<string, { id: string }> = {};

  for (const mod of modules) {
    for (const action of actions) {
      const perm = await prisma.permission.create({
        data: { module: mod, action },
      });
      permissionRecords[`${mod}:${action}`] = perm;
    }
  }
  console.log('Created 24 permissions.');

  // ============================================================
  // 3. Roles (6 roles with specific permissions)
  // ============================================================
  const rolePermissionsMap: Record<string, string[]> = {
    Admin: modules.flatMap((mod) => actions.map((act) => `${mod}:${act}`)),
    'Lab Manager': [
      'dashboard:view',
      'masters:view',
      'masters:create',
      'masters:edit',
      'process:view',
      'process:create',
      'process:edit',
      'reports:view',
    ],
    Accounts: [
      'dashboard:view',
      'masters:view',
      'masters:create',
      'masters:edit',
      'accounts:view',
      'accounts:create',
      'accounts:edit',
    ],
    Chemist: [
      'dashboard:view',
      'process:view',
      'process:create',
      'process:edit',
      'reports:view',
    ],
    Registration: [
      'dashboard:view',
      'masters:view',
      'masters:create',
      'process:view',
      'process:create',
    ],
    Sampler: [
      'dashboard:view',
      'process:view',
      'process:create',
    ],
  };

  const roles: Record<string, { id: string }> = {};

  for (const [roleName, perms] of Object.entries(rolePermissionsMap)) {
    const role = await prisma.role.create({
      data: {
        name: roleName,
        labId: lab.id,
        isSystem: true,
        rolePermissions: {
          create: perms.map((p) => ({
            permissionId: permissionRecords[p].id,
          })),
        },
      },
    });
    roles[roleName] = role;
  }
  console.log('Created 6 roles with permissions.');

  // ============================================================
  // 4. Users (6 employees)
  // ============================================================
  const usersData = [
    { username: 'admin', password: 'admin123', role: 'Admin', name: 'Admin User', email: 'admin@speclabuae.com' },
    { username: 'manager', password: 'manager123', role: 'Lab Manager', name: 'Lab Manager', email: 'manager@speclabuae.com' },
    { username: 'accounts', password: 'accounts123', role: 'Accounts', name: 'Accounts Officer', email: 'accounts@speclabuae.com' },
    { username: 'chemist', password: 'chemist123', role: 'Chemist', name: 'Senior Chemist', email: 'chemist@speclabuae.com' },
    { username: 'registration', password: 'reg123', role: 'Registration', name: 'Registration Clerk', email: 'registration@speclabuae.com' },
    { username: 'sampler', password: 'sampler123', role: 'Sampler', name: 'Field Sampler', email: 'sampler@speclabuae.com' },
  ];

  const users: Record<string, { id: string }> = {};

  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        username: u.username,
        passwordHash: hashSync(u.password, 10),
        roleId: roles[u.role].id,
        labId: lab.id,
        isActive: true,
      },
    });
    users[u.username] = user;
  }
  console.log('Created 6 users.');

  // ============================================================
  // 5. Customers (2)
  // ============================================================
  const customer1 = await prisma.customer.create({
    data: {
      code: 'SP-AHM-001',
      name: 'Ahmed Al Maktoum',
      email: 'ahmed@petroco.ae',
      company: 'PetroCo UAE LLC',
      phone: '+971 50 8765432',
      address: 'Dubai, UAE',
      labId: lab.id,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      code: 'SP-DEM-002',
      name: 'Demo Client',
      email: 'client@demo.com',
      company: 'Demo Company LLC',
      phone: '+971 50 1234567',
      address: 'Dubai, UAE',
      labId: lab.id,
    },
  });
  console.log('Created 2 customers.');

  // ============================================================
  // 6. Portal Users (2, one per customer)
  // ============================================================
  await prisma.portalUser.create({
    data: {
      username: 'petroco',
      password: hashSync('client123', 10),
      customerId: customer1.id,
      labId: lab.id,
    },
  });

  await prisma.portalUser.create({
    data: {
      username: 'demo',
      password: hashSync('client123', 10),
      customerId: customer2.id,
      labId: lab.id,
    },
  });
  console.log('Created 2 portal users.');

  // ============================================================
  // 7. Sample Types (10) with defaultTests as JSON string arrays
  // ============================================================
  const sampleTypesData = [
    {
      name: 'Crude Oil',
      description: 'Crude petroleum oil samples',
      defaultTests: [
        { parameter: 'API Gravity', method: 'ASTM D287', unit: '°API', specMin: null, specMax: null },
        { parameter: 'Kinematic Viscosity @ 40°C', method: 'ASTM D445', unit: 'cSt', specMin: null, specMax: null },
        { parameter: 'Sulphur Content', method: 'ASTM D4294', unit: '% m/m', specMin: null, specMax: null },
        { parameter: 'Water Content', method: 'ASTM D4006', unit: '% v/v', specMin: null, specMax: '0.5' },
        { parameter: 'Sediment Content', method: 'ASTM D473', unit: '% m/m', specMin: null, specMax: '0.10' },
        { parameter: 'Salt Content', method: 'ASTM D3230', unit: 'PTB', specMin: null, specMax: null },
        { parameter: 'Pour Point', method: 'ASTM D97', unit: '°C', specMin: null, specMax: null },
        { parameter: 'Reid Vapor Pressure', method: 'ASTM D323', unit: 'psi', specMin: null, specMax: null },
      ],
    },
    {
      name: 'Fuel Oil',
      description: 'Heavy fuel oil samples',
      defaultTests: [
        { parameter: 'Kinematic Viscosity @ 50°C', method: 'ASTM D445', unit: 'cSt', specMin: null, specMax: '380' },
        { parameter: 'Density @ 15°C', method: 'ASTM D1298', unit: 'kg/m³', specMin: null, specMax: '991.0' },
        { parameter: 'Sulphur Content', method: 'ASTM D4294', unit: '% m/m', specMin: null, specMax: '3.50' },
        { parameter: 'Flash Point', method: 'ASTM D93', unit: '°C', specMin: '60', specMax: null },
        { parameter: 'Pour Point', method: 'ASTM D97', unit: '°C', specMin: null, specMax: '30' },
        { parameter: 'Water Content', method: 'ASTM D95', unit: '% v/v', specMin: null, specMax: '0.5' },
        { parameter: 'Ash Content', method: 'ASTM D482', unit: '% m/m', specMin: null, specMax: '0.10' },
        { parameter: 'Vanadium', method: 'IP 501', unit: 'mg/kg', specMin: null, specMax: '150' },
      ],
    },
    {
      name: 'Diesel',
      description: 'Diesel fuel samples',
      defaultTests: [
        { parameter: 'Kinematic Viscosity @ 40°C', method: 'ASTM D445', unit: 'cSt', specMin: '2.0', specMax: '4.5' },
        { parameter: 'Density @ 15°C', method: 'ASTM D1298', unit: 'kg/m³', specMin: '820', specMax: '860' },
        { parameter: 'Sulphur Content', method: 'ASTM D4294', unit: 'mg/kg', specMin: null, specMax: '500' },
        { parameter: 'Flash Point', method: 'ASTM D93', unit: '°C', specMin: '55', specMax: null },
        { parameter: 'Cetane Index', method: 'ASTM D4737', unit: '', specMin: '46', specMax: null },
        { parameter: 'Cloud Point', method: 'ASTM D2500', unit: '°C', specMin: null, specMax: null },
        { parameter: 'Water Content', method: 'ASTM D6304', unit: 'mg/kg', specMin: null, specMax: '200' },
        { parameter: 'Colour', method: 'ASTM D1500', unit: '', specMin: null, specMax: '3.0' },
      ],
    },
    {
      name: 'Lubricant Oil',
      description: 'Lubricating oil samples',
      defaultTests: [
        { parameter: 'Kinematic Viscosity @ 40°C', method: 'ASTM D445', unit: 'cSt', specMin: null, specMax: null },
        { parameter: 'Kinematic Viscosity @ 100°C', method: 'ASTM D445', unit: 'cSt', specMin: null, specMax: null },
        { parameter: 'Viscosity Index', method: 'ASTM D2270', unit: '', specMin: null, specMax: null },
        { parameter: 'Total Base Number TBN', method: 'ASTM D2896', unit: 'mg KOH/g', specMin: null, specMax: null },
        { parameter: 'Total Acid Number TAN', method: 'ASTM D664', unit: 'mg KOH/g', specMin: null, specMax: null },
        { parameter: 'Flash Point', method: 'ASTM D92', unit: '°C', specMin: null, specMax: null },
        { parameter: 'Pour Point', method: 'ASTM D97', unit: '°C', specMin: null, specMax: null },
        { parameter: 'Water Content', method: 'ASTM D6304', unit: 'ppm', specMin: null, specMax: '500' },
      ],
    },
    {
      name: 'Hydraulic Oil',
      description: 'Hydraulic fluid samples',
      defaultTests: [
        { parameter: 'Kinematic Viscosity @ 40°C', method: 'ASTM D445', unit: 'cSt', specMin: null, specMax: null },
        { parameter: 'Kinematic Viscosity @ 100°C', method: 'ASTM D445', unit: 'cSt', specMin: null, specMax: null },
        { parameter: 'Total Acid Number TAN', method: 'ASTM D664', unit: 'mg KOH/g', specMin: null, specMax: null },
        { parameter: 'Water Content', method: 'ASTM D6304', unit: 'ppm', specMin: null, specMax: '500' },
        { parameter: 'Flash Point', method: 'ASTM D92', unit: '°C', specMin: null, specMax: null },
        { parameter: 'Pour Point', method: 'ASTM D97', unit: '°C', specMin: null, specMax: null },
        { parameter: 'Foam Test', method: 'ASTM D892', unit: 'ml/ml', specMin: null, specMax: null },
        { parameter: 'Particle Count', method: 'ISO 4406', unit: '', specMin: null, specMax: null },
      ],
    },
    {
      name: 'Transformer Oil',
      description: 'Electrical transformer insulating oil samples',
      defaultTests: [
        { parameter: 'Breakdown Voltage', method: 'ASTM D1816', unit: 'kV', specMin: '30', specMax: null },
        { parameter: 'Kinematic Viscosity @ 40°C', method: 'ASTM D445', unit: 'cSt', specMin: null, specMax: '12' },
        { parameter: 'Water Content', method: 'ASTM D1533', unit: 'ppm', specMin: null, specMax: '35' },
        { parameter: 'Total Acid Number TAN', method: 'ASTM D664', unit: 'mg KOH/g', specMin: null, specMax: '0.3' },
        { parameter: 'Interfacial Tension', method: 'ASTM D971', unit: 'mN/m', specMin: '25', specMax: null },
        { parameter: 'Flash Point', method: 'ASTM D92', unit: '°C', specMin: '145', specMax: null },
        { parameter: 'Power Factor @ 25°C', method: 'ASTM D924', unit: '%', specMin: null, specMax: '0.5' },
        { parameter: 'Colour', method: 'ASTM D1500', unit: '', specMin: null, specMax: '3.0' },
      ],
    },
    {
      name: 'Marine Fuel',
      description: 'Marine bunker fuel samples',
      defaultTests: [
        { parameter: 'Kinematic Viscosity @ 50°C', method: 'ASTM D445', unit: 'cSt', specMin: null, specMax: '380' },
        { parameter: 'Density @ 15°C', method: 'ASTM D1298', unit: 'kg/m³', specMin: null, specMax: '991.0' },
        { parameter: 'Sulphur Content', method: 'ASTM D4294', unit: '% m/m', specMin: null, specMax: '0.50' },
        { parameter: 'Flash Point', method: 'ASTM D93', unit: '°C', specMin: '60', specMax: null },
        { parameter: 'Water Content', method: 'ASTM D95', unit: '% v/v', specMin: null, specMax: '0.5' },
        { parameter: 'Ash Content', method: 'ASTM D482', unit: '% m/m', specMin: null, specMax: '0.10' },
        { parameter: 'CCAI', method: 'ISO 8217', unit: '', specMin: null, specMax: '870' },
        { parameter: 'Aluminium + Silicon', method: 'IP 501', unit: 'mg/kg', specMin: null, specMax: '60' },
      ],
    },
    {
      name: 'Base Oil',
      description: 'Base oil stock samples',
      defaultTests: [
        { parameter: 'Kinematic Viscosity @ 40°C', method: 'ASTM D445', unit: 'cSt', specMin: null, specMax: null },
        { parameter: 'Kinematic Viscosity @ 100°C', method: 'ASTM D445', unit: 'cSt', specMin: null, specMax: null },
        { parameter: 'Viscosity Index', method: 'ASTM D2270', unit: '', specMin: '80', specMax: null },
        { parameter: 'Flash Point', method: 'ASTM D92', unit: '°C', specMin: '200', specMax: null },
        { parameter: 'Pour Point', method: 'ASTM D97', unit: '°C', specMin: null, specMax: '-9' },
        { parameter: 'Colour', method: 'ASTM D1500', unit: '', specMin: null, specMax: null },
        { parameter: 'Sulphur Content', method: 'ASTM D4294', unit: '% m/m', specMin: null, specMax: '0.03' },
        { parameter: 'Specific Gravity @ 15.6°C', method: 'ASTM D1298', unit: '', specMin: null, specMax: null },
      ],
    },
    {
      name: 'Gas Oil',
      description: 'Gas oil / light fuel oil samples',
      defaultTests: [
        { parameter: 'Kinematic Viscosity @ 40°C', method: 'ASTM D445', unit: 'cSt', specMin: '2.0', specMax: '5.8' },
        { parameter: 'Density @ 15°C', method: 'ASTM D1298', unit: 'kg/m³', specMin: null, specMax: '876' },
        { parameter: 'Sulphur Content', method: 'ASTM D4294', unit: '% m/m', specMin: null, specMax: '1.0' },
        { parameter: 'Flash Point', method: 'ASTM D93', unit: '°C', specMin: '60', specMax: null },
        { parameter: 'Pour Point', method: 'ASTM D97', unit: '°C', specMin: null, specMax: null },
        { parameter: 'Water Content', method: 'ASTM D95', unit: '% v/v', specMin: null, specMax: '0.5' },
        { parameter: 'Ash Content', method: 'ASTM D482', unit: '% m/m', specMin: null, specMax: '0.01' },
        { parameter: 'Colour', method: 'ASTM D1500', unit: '', specMin: null, specMax: null },
      ],
    },
    {
      name: 'Bitumen',
      description: 'Bitumen / asphalt samples',
      defaultTests: [
        { parameter: 'Penetration @ 25°C', method: 'ASTM D5', unit: 'dmm', specMin: '60', specMax: '70' },
        { parameter: 'Softening Point', method: 'ASTM D36', unit: '°C', specMin: '46', specMax: '56' },
        { parameter: 'Ductility @ 25°C', method: 'ASTM D113', unit: 'cm', specMin: '100', specMax: null },
        { parameter: 'Flash Point', method: 'ASTM D92', unit: '°C', specMin: '232', specMax: null },
        { parameter: 'Specific Gravity @ 25°C', method: 'ASTM D70', unit: '', specMin: '1.00', specMax: '1.05' },
        { parameter: 'Solubility in TCE', method: 'ASTM D2042', unit: '%', specMin: '99', specMax: null },
        { parameter: 'Loss on Heating', method: 'ASTM D1754', unit: '%', specMin: null, specMax: '0.8' },
        { parameter: 'Penetration after RTFOT', method: 'ASTM D5', unit: '% retained', specMin: '54', specMax: null },
      ],
    },
  ];

  const sampleTypes: Record<string, { id: string }> = {};

  for (const st of sampleTypesData) {
    const sampleType = await prisma.sampleType.create({
      data: {
        name: st.name,
        description: st.description,
        defaultTests: JSON.stringify(st.defaultTests),
        labId: lab.id,
      },
    });
    sampleTypes[st.name] = sampleType;
  }
  console.log('Created 10 sample types.');

  // ============================================================
  // 8. Default Report Template
  // ============================================================
  await prisma.reportTemplate.create({
    data: {
      name: 'Standard COA',
      headerText: 'An ISO/IEC 17025:2017 Accredited Laboratory\nEmirates National Accreditation System (ENAS)',
      footerText: 'The test Report shall not be reproduced (except in full) without the written approval of SPECTRUM. When analysis is witnessed by us or carried out by sub contract labs, our responsibility is solely to ensure that the analysis is conducted to standard test methods in accordance with industry accepted practice. We are not responsible for apparatus, instrumentation and measuring devices, their calibration or working order, reagents and solutions are accepted as prepared.',
      showLabLogo: true,
      isDefault: true,
      labId: lab.id,
    },
  });
  console.log('Created default report template.');

  // ============================================================
  // 9. FormatID records (3)
  // ============================================================
  const formatSample = await prisma.formatID.create({
    data: { module: 'sample', prefix: 'SPL', lastNumber: 4, labId: lab.id },
  });

  const formatReport = await prisma.formatID.create({
    data: { module: 'report', prefix: 'RPT', lastNumber: 1, labId: lab.id },
  });

  const formatInvoice = await prisma.formatID.create({
    data: { module: 'invoice', prefix: 'INV', lastNumber: 1, labId: lab.id },
  });

  const formatQuotation = await prisma.formatID.create({
    data: { module: 'quotation', prefix: 'QUO', lastNumber: 0, labId: lab.id },
  });
  console.log('Created 4 format ID records.');

  // ============================================================
  // 9. Demo samples (4)
  // ============================================================
  const sample1 = await prisma.sample.create({
    data: {
      sampleNumber: 'SPL-260101-001',
      clientId: customer2.id,
      sampleTypeId: sampleTypes['Diesel'].id,
      description: 'Diesel fuel sample from storage tank #3',
      quantity: '500ml',
      priority: 'normal',
      status: 'completed',
      assignedToId: users['chemist'].id,
      collectedById: users['sampler'].id,
      collectionDate: new Date('2026-01-01'),
      registeredById: users['registration'].id,
      registeredAt: new Date('2026-01-01'),
      labId: lab.id,
    },
  });

  const sample2 = await prisma.sample.create({
    data: {
      sampleNumber: 'SPL-260115-001',
      clientId: customer2.id,
      sampleTypeId: sampleTypes['Lubricant Oil'].id,
      description: 'Engine oil sample from generator unit',
      quantity: '250ml',
      priority: 'urgent',
      status: 'testing',
      assignedToId: users['chemist'].id,
      collectedById: users['sampler'].id,
      collectionDate: new Date('2026-01-15'),
      registeredById: users['registration'].id,
      registeredAt: new Date('2026-01-15'),
      labId: lab.id,
    },
  });

  const sample3 = await prisma.sample.create({
    data: {
      sampleNumber: 'SPL-260220-001',
      clientId: customer1.id,
      sampleTypeId: sampleTypes['Crude Oil'].id,
      description: 'Crude oil sample from well site A7',
      quantity: '1L',
      priority: 'rush',
      status: 'registered',
      collectedById: users['sampler'].id,
      collectionDate: new Date('2026-02-20'),
      registeredById: users['registration'].id,
      registeredAt: new Date('2026-02-20'),
      labId: lab.id,
    },
  });

  const sample4 = await prisma.sample.create({
    data: {
      sampleNumber: 'SPL-260222-001',
      clientId: customer2.id,
      sampleTypeId: sampleTypes['Diesel'].id,
      description: 'Diesel quality check from delivery batch',
      quantity: '500ml',
      priority: 'normal',
      status: 'pending',
      labId: lab.id,
    },
  });
  console.log('Created 4 demo samples.');

  // ============================================================
  // 10. Test results for completed sample (SPL-260101-001)
  // ============================================================
  const dieselTests = sampleTypesData.find((st) => st.name === 'Diesel')!.defaultTests;

  const testResultValues: Record<string, string> = {
    'Kinematic Viscosity @ 40°C': '3.2',
    'Density @ 15°C': '842',
    'Sulphur Content': '320',
    'Flash Point': '68',
    'Cetane Index': '52',
    'Cloud Point': '-4',
    'Water Content': '85',
    'Colour': '1.5',
  };

  for (const test of dieselTests) {
    await prisma.testResult.create({
      data: {
        sampleId: sample1.id,
        parameter: test.parameter,
        testMethod: test.method,
        resultValue: testResultValues[test.parameter] || null,
        unit: test.unit,
        specMin: test.specMin,
        specMax: test.specMax,
        status: 'completed',
        enteredById: users['chemist'].id,
        enteredAt: new Date('2026-01-03'),
      },
    });
  }
  console.log('Created 8 test results for completed sample.');

  // ============================================================
  // 11. Demo report
  // ============================================================
  const report = await prisma.report.create({
    data: {
      reportNumber: 'RPT-260105-001',
      sampleId: sample1.id,
      reportType: 'test_report',
      title: 'Diesel Fuel Analysis Report',
      status: 'published',
      createdById: users['chemist'].id,
      labId: lab.id,
      createdAt: new Date('2026-01-05'),
    },
  });
  console.log('Created demo report:', report.reportNumber);

  // ============================================================
  // 12. Demo invoice
  // ============================================================
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-260105-001',
      clientId: customer2.id,
      subtotal: 1500,
      taxRate: 5,
      taxAmount: 75,
      total: 1575,
      status: 'sent',
      dueDate: dueDate,
      createdById: users['accounts'].id,
      labId: lab.id,
      createdAt: new Date('2026-01-05'),
      items: {
        create: {
          sampleId: sample1.id,
          description: 'Diesel Fuel Analysis - Full Panel',
          quantity: 1,
          unitPrice: 1500,
          total: 1500,
        },
      },
    },
  });
  console.log('Created demo invoice:', invoice.invoiceNumber);

  // ============================================================
  // Summary
  // ============================================================
  console.log('\n--- Seed Summary ---');
  console.log('Lab:          1');
  console.log('Permissions: 24');
  console.log('Roles:        6');
  console.log('Users:        6');
  console.log('Customers:    2');
  console.log('Portal Users: 2');
  console.log('Sample Types:10');
  console.log('Format IDs:   3');
  console.log('Samples:      4');
  console.log('Test Results: 8');
  console.log('Reports:      1');
  console.log('Invoices:     1');
  console.log('\nDatabase seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
