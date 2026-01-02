const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('spectrum_lims.db');

// Create tables
db.exec(`
    -- Employees table
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'technician',
        department TEXT,
        phone TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
    );

    -- Clients table
    CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        company TEXT,
        phone TEXT,
        address TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
    );

    -- Sample types table
    CREATE TABLE IF NOT EXISTS sample_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        parameters TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Samples table
    CREATE TABLE IF NOT EXISTS samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_number TEXT UNIQUE NOT NULL,
        client_id INTEGER NOT NULL,
        sample_type_id INTEGER,
        description TEXT,
        quantity TEXT,
        priority TEXT DEFAULT 'normal',
        status TEXT DEFAULT 'pending',
        assigned_to INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (sample_type_id) REFERENCES sample_types(id),
        FOREIGN KEY (assigned_to) REFERENCES employees(id)
    );

    -- Reports table
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_number TEXT UNIQUE NOT NULL,
        sample_id INTEGER NOT NULL,
        title TEXT,
        content TEXT,
        test_results TEXT,
        created_by INTEGER,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        FOREIGN KEY (sample_id) REFERENCES samples(id),
        FOREIGN KEY (created_by) REFERENCES employees(id)
    );
`);

// Insert default admin user
const adminPassword = bcrypt.hashSync('admin123', 10);
try {
    db.prepare(`
        INSERT INTO employees (name, email, password, role, department, phone)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run('Admin User', 'admin@speclabuae.com', adminPassword, 'admin', 'Administration', '+971 52 6864717');
    console.log('Admin user created: admin@speclabuae.com / admin123');
} catch (e) {
    console.log('Admin user already exists');
}

// Insert sample technician
const techPassword = bcrypt.hashSync('tech123', 10);
try {
    db.prepare(`
        INSERT INTO employees (name, email, password, role, department, phone)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run('Lab Technician', 'tech@speclabuae.com', techPassword, 'technician', 'Laboratory', '+971 6 7444718');
    console.log('Technician user created: tech@speclabuae.com / tech123');
} catch (e) {
    console.log('Technician user already exists');
}

// Insert demo client
const clientPassword = bcrypt.hashSync('client123', 10);
try {
    db.prepare(`
        INSERT INTO clients (name, email, password, company, phone, address)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run('Demo Client', 'client@demo.com', clientPassword, 'Demo Company LLC', '+971 50 1234567', 'Dubai, UAE');
    console.log('Demo client created: client@demo.com / client123');
} catch (e) {
    console.log('Demo client already exists');
}

// Insert sample types for oil testing lab
const sampleTypes = [
    { name: 'Residual Fuel Analysis', description: 'Complete analysis of residual fuel oils', category: 'Fuel' },
    { name: 'MGO Analysis', description: 'Marine Gas Oil testing and analysis', category: 'Fuel' },
    { name: 'Bitumen Analysis', description: 'Complete bitumen testing including penetration, softening point', category: 'Bitumen' },
    { name: 'Lubricant Analysis', description: 'Engine oil and lubricant condition monitoring', category: 'Lubricant' },
    { name: 'Distillate Fuel Analysis', description: 'Diesel and light fuel oil testing', category: 'Fuel' },
    { name: 'Transformer Oil Analysis', description: 'Electrical insulating oil testing', category: 'Oil' },
    { name: 'Hydraulic Oil Analysis', description: 'Hydraulic fluid testing and contamination analysis', category: 'Oil' },
    { name: 'Crude Oil Analysis', description: 'Complete crude oil characterization', category: 'Oil' },
    { name: 'Natural Gas Analysis', description: 'Gas chromatography and composition analysis', category: 'Gas' },
    { name: 'Water Analysis', description: 'Industrial water and effluent testing', category: 'Water' },
    { name: 'Bunker Fuel Analysis', description: 'Marine bunker fuel quality testing', category: 'Fuel' },
    { name: 'Grease Analysis', description: 'Lubricating grease testing', category: 'Lubricant' }
];

sampleTypes.forEach(type => {
    try {
        db.prepare(`
            INSERT INTO sample_types (name, description, category)
            VALUES (?, ?, ?)
        `).run(type.name, type.description, type.category);
    } catch (e) {
        // Already exists
    }
});

console.log('Sample types created');

// Insert demo samples
const demoClient = db.prepare('SELECT id FROM clients WHERE email = ?').get('client@demo.com');
const lubricantType = db.prepare('SELECT id FROM sample_types WHERE name = ?').get('Lubricant Analysis');

if (demoClient && lubricantType) {
    try {
        db.prepare(`
            INSERT INTO samples (sample_number, client_id, sample_type_id, description, quantity, priority, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('SPL-DEMO001', demoClient.id, lubricantType.id, 'Engine oil sample from generator', '500ml', 'normal', 'pending');

        db.prepare(`
            INSERT INTO samples (sample_number, client_id, sample_type_id, description, quantity, priority, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('SPL-DEMO002', demoClient.id, lubricantType.id, 'Hydraulic oil sample from crane', '250ml', 'urgent', 'in_progress');

        console.log('Demo samples created');
    } catch (e) {
        console.log('Demo samples already exist');
    }
}

console.log('Database initialization complete!');
db.close();
