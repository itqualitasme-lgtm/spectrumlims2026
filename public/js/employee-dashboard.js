// ===================================
// SPECTRUM LIMS - Employee Dashboard
// ===================================

let currentUser = null;
let allSamples = [];
let allReports = [];

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadDashboard();
});

// Check if user is authenticated
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        const data = await response.json();
        currentUser = data.user;

        if (currentUser.role === 'client') {
            window.location.href = '/client-dashboard.html';
            return;
        }

        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userRole').textContent = capitalizeFirst(currentUser.role);

        // Show/hide admin-only elements
        if (currentUser.role !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    } catch (error) {
        window.location.href = '/';
    }
}

// Load dashboard data
async function loadDashboard() {
    await loadStats();
    await loadSamples();
    await loadReports();
    await loadClients();
    await loadSampleTypes();

    if (currentUser.role === 'admin') {
        await loadEmployees();
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();

        document.getElementById('totalSamples').textContent = stats.totalSamples;
        document.getElementById('pendingSamples').textContent = stats.pendingSamples;
        document.getElementById('inProgressSamples').textContent = stats.inProgressSamples;
        document.getElementById('completedSamples').textContent = stats.completedSamples;
        document.getElementById('totalClients').textContent = stats.totalClients;
        document.getElementById('totalReports').textContent = stats.totalReports;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Load samples
async function loadSamples() {
    try {
        const response = await fetch('/api/samples');
        allSamples = await response.json();
        renderSamples(allSamples);
        renderRecentSamples(allSamples.slice(0, 5));
        populateSampleSelect();
    } catch (error) {
        console.error('Failed to load samples:', error);
    }
}

// Render samples table
function renderSamples(samples) {
    const tbody = document.getElementById('samplesTable');

    if (samples.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-vial"></i>
                        <h4>No samples found</h4>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = samples.map(sample => `
        <tr>
            <td><strong>${sample.sample_number}</strong></td>
            <td>
                <div>${sample.client_name || 'N/A'}</div>
                <small style="color: var(--gray-500)">${sample.company || ''}</small>
            </td>
            <td>${sample.test_name || 'N/A'}</td>
            <td><span class="badge badge-${sample.priority}">${sample.priority}</span></td>
            <td><span class="badge badge-${sample.status}">${formatStatus(sample.status)}</span></td>
            <td>${formatDate(sample.created_at)}</td>
            <td>
                <button class="action-btn edit" onclick="openUpdateSampleModal(${sample.id}, '${sample.sample_number}', '${sample.status}', '${sample.notes || ''}')">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Render recent samples for dashboard
function renderRecentSamples(samples) {
    const tbody = document.getElementById('recentSamplesTable');

    if (samples.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No samples yet</td></tr>';
        return;
    }

    tbody.innerHTML = samples.map(sample => `
        <tr>
            <td><strong>${sample.sample_number}</strong></td>
            <td>${sample.client_name || 'N/A'}</td>
            <td>${sample.test_name || 'N/A'}</td>
            <td><span class="badge badge-${sample.status}">${formatStatus(sample.status)}</span></td>
        </tr>
    `).join('');
}

// Filter samples
function filterSamples() {
    const search = document.getElementById('sampleSearch').value.toLowerCase();
    const status = document.getElementById('sampleStatusFilter').value;

    let filtered = allSamples;

    if (status !== 'all') {
        filtered = filtered.filter(s => s.status === status);
    }

    if (search) {
        filtered = filtered.filter(s =>
            s.sample_number.toLowerCase().includes(search) ||
            (s.client_name && s.client_name.toLowerCase().includes(search)) ||
            (s.company && s.company.toLowerCase().includes(search))
        );
    }

    renderSamples(filtered);
}

// Populate sample select for report creation
function populateSampleSelect() {
    const select = document.getElementById('reportSampleSelect');
    select.innerHTML = '<option value="">Select a sample...</option>';

    const completedSamples = allSamples.filter(s => s.status === 'completed' || s.status === 'testing');
    completedSamples.forEach(sample => {
        const option = document.createElement('option');
        option.value = sample.id;
        option.textContent = `${sample.sample_number} - ${sample.client_name || 'N/A'}`;
        select.appendChild(option);
    });
}

// Load reports
async function loadReports() {
    try {
        const response = await fetch('/api/reports');
        allReports = await response.json();
        renderReports(allReports);
        renderRecentReports(allReports.slice(0, 5));
    } catch (error) {
        console.error('Failed to load reports:', error);
    }
}

// Render reports table
function renderReports(reports) {
    const tbody = document.getElementById('reportsTable');

    if (reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <h4>No reports yet</h4>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = reports.map(report => `
        <tr>
            <td><strong>${report.report_number}</strong></td>
            <td>${report.sample_number}</td>
            <td>${report.client_name || 'N/A'}</td>
            <td>${report.created_by_name || 'N/A'}</td>
            <td><span class="badge badge-${report.status}">${report.status}</span></td>
            <td>${formatDate(report.created_at)}</td>
            <td>
                <button class="action-btn" onclick="publishReport(${report.id})" ${report.status === 'published' ? 'disabled' : ''}>
                    <i class="fas fa-check"></i> ${report.status === 'published' ? 'Published' : 'Publish'}
                </button>
            </td>
        </tr>
    `).join('');
}

// Render recent reports
function renderRecentReports(reports) {
    const tbody = document.getElementById('recentReportsTable');

    if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No reports yet</td></tr>';
        return;
    }

    tbody.innerHTML = reports.map(report => `
        <tr>
            <td><strong>${report.report_number}</strong></td>
            <td>${report.sample_number}</td>
            <td><span class="badge badge-${report.status}">${report.status}</span></td>
            <td>${formatDate(report.created_at)}</td>
        </tr>
    `).join('');
}

// Load clients
async function loadClients() {
    try {
        const response = await fetch('/api/clients');
        const clients = await response.json();
        renderClients(clients);
    } catch (error) {
        console.error('Failed to load clients:', error);
    }
}

// Render clients table
function renderClients(clients) {
    const tbody = document.getElementById('clientsTable');

    if (clients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h4>No clients yet</h4>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = clients.map(client => `
        <tr>
            <td><strong>${client.name}</strong></td>
            <td>${client.company || '-'}</td>
            <td>${client.email}</td>
            <td>${client.phone || '-'}</td>
            <td><span class="badge badge-${client.status}">${client.status}</span></td>
            <td>
                <button class="action-btn edit" onclick="editClient(${client.id})">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load employees (admin only)
async function loadEmployees() {
    try {
        const response = await fetch('/api/employees');
        if (!response.ok) return;
        const employees = await response.json();
        renderEmployees(employees);
    } catch (error) {
        console.error('Failed to load employees:', error);
    }
}

// Render employees table
function renderEmployees(employees) {
    const tbody = document.getElementById('employeesTable');

    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-user-tie"></i>
                        <h4>No employees yet</h4>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = employees.map(emp => `
        <tr>
            <td><strong>${emp.name}</strong></td>
            <td>${emp.email}</td>
            <td><span class="badge">${capitalizeFirst(emp.role)}</span></td>
            <td>${emp.department || '-'}</td>
            <td><span class="badge badge-${emp.status}">${emp.status}</span></td>
            <td>
                <button class="action-btn edit" onclick="editEmployee(${emp.id})">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load sample types
async function loadSampleTypes() {
    try {
        const response = await fetch('/api/sample-types');
        const types = await response.json();
        renderSampleTypes(types);
    } catch (error) {
        console.error('Failed to load sample types:', error);
    }
}

// Render sample types table
function renderSampleTypes(types) {
    const tbody = document.getElementById('sampleTypesTable');

    if (types.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No sample types</td></tr>';
        return;
    }

    tbody.innerHTML = types.map(type => `
        <tr>
            <td><strong>${type.name}</strong></td>
            <td>${type.category || '-'}</td>
            <td>${type.description || '-'}</td>
            <td><span class="badge badge-${type.status}">${type.status}</span></td>
        </tr>
    `).join('');
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openUpdateSampleModal(id, sampleNumber, status, notes) {
    document.getElementById('updateSampleId').value = id;
    document.getElementById('updateSampleNumber').value = sampleNumber;
    document.getElementById('updateSampleStatus').value = status;
    document.getElementById('updateSampleNotes').value = notes;
    openModal('updateSampleModal');
}

function openAddClientModal() {
    document.getElementById('addClientForm').reset();
    openModal('addClientModal');
}

function openAddEmployeeModal() {
    document.getElementById('addEmployeeForm').reset();
    openModal('addEmployeeModal');
}

function openCreateReportModal() {
    document.getElementById('createReportForm').reset();
    openModal('createReportModal');
}

// Update sample
async function updateSample(event) {
    event.preventDefault();

    const id = document.getElementById('updateSampleId').value;
    const status = document.getElementById('updateSampleStatus').value;
    const notes = document.getElementById('updateSampleNotes').value;

    try {
        const response = await fetch(`/api/samples/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, notes })
        });

        if (response.ok) {
            showToast('Sample updated successfully', 'success');
            closeModal('updateSampleModal');
            await loadSamples();
            await loadStats();
        } else {
            showToast('Failed to update sample', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
}

// Add client
async function addClient(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Client added successfully', 'success');
            closeModal('addClientModal');
            await loadClients();
            await loadStats();
        } else {
            showToast(result.error || 'Failed to add client', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
}

// Add employee
async function addEmployee(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Employee added successfully', 'success');
            closeModal('addEmployeeModal');
            await loadEmployees();
        } else {
            showToast(result.error || 'Failed to add employee', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
}

// Create report
async function createReport(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Parse test results JSON
    try {
        if (data.test_results) {
            data.test_results = JSON.parse(data.test_results);
        } else {
            data.test_results = [];
        }
    } catch (e) {
        showToast('Invalid JSON format for test results', 'error');
        return;
    }

    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Report created successfully: ' + result.report_number, 'success');
            closeModal('createReportModal');
            await loadReports();
            await loadStats();
        } else {
            showToast(result.error || 'Failed to create report', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
}

// Publish report
async function publishReport(id) {
    try {
        const response = await fetch(`/api/reports/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'published' })
        });

        if (response.ok) {
            showToast('Report published successfully', 'success');
            await loadReports();
        } else {
            showToast('Failed to publish report', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
}

// Navigation
function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === 'page-' + page);
    });

    const titles = {
        dashboard: 'Dashboard',
        samples: 'Sample Management',
        reports: 'Test Reports',
        clients: 'Client Management',
        employees: 'Employee Management',
        'sample-types': 'Sample Types'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
}

// Sidebar navigation click handlers
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.page);
    });
});

// Toggle sidebar on mobile
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Logout
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        window.location.href = '/';
    }
}

// Utility functions
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatStatus(status) {
    return status.replace(/_/g, ' ');
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Toast notifications
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="toast-icon fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Placeholder functions for edit
function editClient(id) {
    showToast('Edit client functionality - ID: ' + id, 'warning');
}

function editEmployee(id) {
    showToast('Edit employee functionality - ID: ' + id, 'warning');
}
