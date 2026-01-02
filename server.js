const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new Database('spectrum_lims.db');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
    secret: 'spectrum-lims-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

const requireEmployee = (req, res, next) => {
    if (req.session.user && req.session.user.role !== 'client') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// ============= AUTH ROUTES =============

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password, loginType } = req.body;

    try {
        let user;
        if (loginType === 'client') {
            user = db.prepare('SELECT * FROM clients WHERE email = ? AND status = ?').get(email, 'active');
        } else {
            user = db.prepare('SELECT * FROM employees WHERE email = ? AND status = ?').get(email, 'active');
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: loginType === 'client' ? 'client' : user.role,
            company: user.company || null
        };

        res.json({
            success: true,
            user: req.session.user,
            redirect: loginType === 'client' ? '/client-dashboard.html' : '/employee-dashboard.html'
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Get current user
app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.session.user });
});

// ============= CLIENT ROUTES =============

// Get client's samples
app.get('/api/client/samples', requireAuth, (req, res) => {
    try {
        const samples = db.prepare(`
            SELECT s.*, st.name as test_name
            FROM samples s
            LEFT JOIN sample_types st ON s.sample_type_id = st.id
            WHERE s.client_id = ?
            ORDER BY s.created_at DESC
        `).all(req.session.user.id);
        res.json(samples);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch samples' });
    }
});

// Get client's reports
app.get('/api/client/reports', requireAuth, (req, res) => {
    try {
        const reports = db.prepare(`
            SELECT r.*, s.sample_number, s.description as sample_description
            FROM reports r
            JOIN samples s ON r.sample_id = s.id
            WHERE s.client_id = ? AND r.status = 'published'
            ORDER BY r.created_at DESC
        `).all(req.session.user.id);
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Submit new sample request
app.post('/api/client/samples', requireAuth, (req, res) => {
    const { sample_type_id, description, quantity, priority } = req.body;
    const sampleNumber = 'SPL-' + Date.now().toString(36).toUpperCase();

    try {
        const result = db.prepare(`
            INSERT INTO samples (sample_number, client_id, sample_type_id, description, quantity, priority, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
        `).run(sampleNumber, req.session.user.id, sample_type_id, description, quantity, priority);

        res.json({ success: true, sample_number: sampleNumber, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create sample' });
    }
});

// ============= EMPLOYEE ROUTES =============

// Get all samples (employees)
app.get('/api/samples', requireEmployee, (req, res) => {
    try {
        const { status, search } = req.query;
        let query = `
            SELECT s.*, st.name as test_name, c.name as client_name, c.company
            FROM samples s
            LEFT JOIN sample_types st ON s.sample_type_id = st.id
            LEFT JOIN clients c ON s.client_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += ' AND s.status = ?';
            params.push(status);
        }
        if (search) {
            query += ' AND (s.sample_number LIKE ? OR c.name LIKE ? OR c.company LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY s.created_at DESC';
        const samples = db.prepare(query).all(...params);
        res.json(samples);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch samples' });
    }
});

// Update sample status
app.put('/api/samples/:id', requireEmployee, (req, res) => {
    const { status, assigned_to, notes } = req.body;
    try {
        db.prepare(`
            UPDATE samples SET status = ?, assigned_to = ?, notes = ?, updated_at = datetime('now')
            WHERE id = ?
        `).run(status, assigned_to, notes, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update sample' });
    }
});

// Get all clients (employees)
app.get('/api/clients', requireEmployee, (req, res) => {
    try {
        const clients = db.prepare(`
            SELECT id, name, email, company, phone, address, status, created_at
            FROM clients ORDER BY created_at DESC
        `).all();
        res.json(clients);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// Create client
app.post('/api/clients', requireEmployee, (req, res) => {
    const { name, email, password, company, phone, address } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    try {
        const result = db.prepare(`
            INSERT INTO clients (name, email, password, company, phone, address, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now'))
        `).run(name, email, hashedPassword, company, phone, address);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint')) {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create client' });
        }
    }
});

// Update client
app.put('/api/clients/:id', requireEmployee, (req, res) => {
    const { name, email, company, phone, address, status } = req.body;
    try {
        db.prepare(`
            UPDATE clients SET name = ?, email = ?, company = ?, phone = ?, address = ?, status = ?
            WHERE id = ?
        `).run(name, email, company, phone, address, status, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update client' });
    }
});

// Get sample types
app.get('/api/sample-types', requireAuth, (req, res) => {
    try {
        const types = db.prepare('SELECT * FROM sample_types WHERE status = ? ORDER BY name').all('active');
        res.json(types);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sample types' });
    }
});

// Get employees
app.get('/api/employees', requireAdmin, (req, res) => {
    try {
        const employees = db.prepare(`
            SELECT id, name, email, role, department, phone, status, created_at
            FROM employees ORDER BY created_at DESC
        `).all();
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// Create employee
app.post('/api/employees', requireAdmin, (req, res) => {
    const { name, email, password, role, department, phone } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    try {
        const result = db.prepare(`
            INSERT INTO employees (name, email, password, role, department, phone, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now'))
        `).run(name, email, hashedPassword, role, department, phone);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint')) {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create employee' });
        }
    }
});

// Create report
app.post('/api/reports', requireEmployee, (req, res) => {
    const { sample_id, title, content, test_results } = req.body;
    const reportNumber = 'RPT-' + Date.now().toString(36).toUpperCase();

    try {
        const result = db.prepare(`
            INSERT INTO reports (report_number, sample_id, title, content, test_results, created_by, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'draft', datetime('now'))
        `).run(reportNumber, sample_id, title, content, JSON.stringify(test_results), req.session.user.id);
        res.json({ success: true, report_number: reportNumber, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create report' });
    }
});

// Get all reports (employees)
app.get('/api/reports', requireEmployee, (req, res) => {
    try {
        const reports = db.prepare(`
            SELECT r.*, s.sample_number, c.name as client_name, c.company,
                   e.name as created_by_name
            FROM reports r
            JOIN samples s ON r.sample_id = s.id
            LEFT JOIN clients c ON s.client_id = c.id
            LEFT JOIN employees e ON r.created_by = e.id
            ORDER BY r.created_at DESC
        `).all();
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Update report status
app.put('/api/reports/:id', requireEmployee, (req, res) => {
    const { status, title, content, test_results } = req.body;
    try {
        if (title && content) {
            db.prepare(`
                UPDATE reports SET status = ?, title = ?, content = ?, test_results = ?, updated_at = datetime('now')
                WHERE id = ?
            `).run(status, title, content, JSON.stringify(test_results), req.params.id);
        } else {
            db.prepare(`
                UPDATE reports SET status = ?, updated_at = datetime('now')
                WHERE id = ?
            `).run(status, req.params.id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update report' });
    }
});

// Dashboard stats
app.get('/api/stats', requireEmployee, (req, res) => {
    try {
        const totalSamples = db.prepare('SELECT COUNT(*) as count FROM samples').get().count;
        const pendingSamples = db.prepare("SELECT COUNT(*) as count FROM samples WHERE status = 'pending'").get().count;
        const inProgressSamples = db.prepare("SELECT COUNT(*) as count FROM samples WHERE status = 'in_progress'").get().count;
        const completedSamples = db.prepare("SELECT COUNT(*) as count FROM samples WHERE status = 'completed'").get().count;
        const totalClients = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
        const totalReports = db.prepare('SELECT COUNT(*) as count FROM reports').get().count;

        res.json({
            totalSamples,
            pendingSamples,
            inProgressSamples,
            completedSamples,
            totalClients,
            totalReports
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Client dashboard stats
app.get('/api/client/stats', requireAuth, (req, res) => {
    try {
        const totalSamples = db.prepare('SELECT COUNT(*) as count FROM samples WHERE client_id = ?').get(req.session.user.id).count;
        const pendingSamples = db.prepare("SELECT COUNT(*) as count FROM samples WHERE client_id = ? AND status = 'pending'").get(req.session.user.id).count;
        const inProgressSamples = db.prepare("SELECT COUNT(*) as count FROM samples WHERE client_id = ? AND status = 'in_progress'").get(req.session.user.id).count;
        const completedSamples = db.prepare("SELECT COUNT(*) as count FROM samples WHERE client_id = ? AND status = 'completed'").get(req.session.user.id).count;
        const totalReports = db.prepare(`
            SELECT COUNT(*) as count FROM reports r
            JOIN samples s ON r.sample_id = s.id
            WHERE s.client_id = ? AND r.status = 'published'
        `).get(req.session.user.id).count;

        res.json({
            totalSamples,
            pendingSamples,
            inProgressSamples,
            completedSamples,
            totalReports
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Spectrum LIMS Server running on http://localhost:${PORT}`);
});
