// ===================================
// SPECTRUM LIMS - Client Dashboard
// ===================================

let currentUser = null;
let allSamples = [];

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadDashboard();
    await loadSampleTypes();
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

        if (currentUser.role !== 'client') {
            window.location.href = '/employee-dashboard.html';
            return;
        }

        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileCompany').textContent = currentUser.company || '';
        document.getElementById('profileEmail').textContent = currentUser.email;
    } catch (error) {
        window.location.href = '/';
    }
}

// Load dashboard data
async function loadDashboard() {
    await loadStats();
    await loadSamples();
    await loadReports();
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/api/client/stats');
        const stats = await response.json();

        document.getElementById('totalSamples').textContent = stats.totalSamples;
        document.getElementById('pendingSamples').textContent = stats.pendingSamples;
        document.getElementById('inProgressSamples').textContent = stats.inProgressSamples;
        document.getElementById('completedSamples').textContent = stats.completedSamples;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Load samples
async function loadSamples() {
    try {
        const response = await fetch('/api/client/samples');
        allSamples = await response.json();
        renderSamples(allSamples);
        renderRecentSamples(allSamples.slice(0, 5));
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
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-vial"></i>
                        <h4>No samples found</h4>
                        <p>Submit your first sample to get started</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = samples.map(sample => `
        <tr>
            <td><strong>${sample.sample_number}</strong></td>
            <td>${sample.test_name || 'N/A'}</td>
            <td>${sample.description || '-'}</td>
            <td><span class="badge badge-${sample.priority}">${sample.priority}</span></td>
            <td><span class="badge badge-${sample.status}">${formatStatus(sample.status)}</span></td>
            <td>${formatDate(sample.created_at)}</td>
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
            <td>${sample.test_name || 'N/A'}</td>
            <td><span class="badge badge-${sample.status}">${formatStatus(sample.status)}</span></td>
            <td>${formatDate(sample.created_at)}</td>
        </tr>
    `).join('');
}

// Load reports
async function loadReports() {
    try {
        const response = await fetch('/api/client/reports');
        const reports = await response.json();
        renderReports(reports);
        renderRecentReports(reports.slice(0, 5));
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
                <td colspan="5">
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <h4>No reports available</h4>
                        <p>Reports will appear here once testing is complete</p>
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
            <td>${report.title || 'Test Report'}</td>
            <td>${formatDate(report.created_at)}</td>
            <td>
                <button class="action-btn view" onclick="viewReport(${report.id}, '${report.report_number}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

// Render recent reports for dashboard
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
            <td>${formatDate(report.created_at)}</td>
            <td>
                <button class="action-btn view" onclick="viewReport(${report.id}, '${report.report_number}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load sample types for form
async function loadSampleTypes() {
    try {
        const response = await fetch('/api/sample-types');
        const types = await response.json();
        const select = document.getElementById('sampleType');

        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load sample types:', error);
    }
}

// Submit new sample
async function submitNewSample(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch('/api/client/samples', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Sample submitted successfully! Sample #: ' + result.sample_number, 'success');
            form.reset();
            await loadDashboard();
            navigateTo('samples');
        } else {
            showToast(result.error || 'Failed to submit sample', 'error');
        }
    } catch (error) {
        showToast('Connection error. Please try again.', 'error');
    }
}

// Filter samples
function filterSamples() {
    const status = document.getElementById('sampleStatusFilter').value;

    let filtered = allSamples;
    if (status !== 'all') {
        filtered = allSamples.filter(s => s.status === status);
    }

    renderSamples(filtered);
}

// View report
function viewReport(id, reportNumber) {
    document.getElementById('reportModalTitle').textContent = 'Report: ' + reportNumber;
    document.getElementById('reportModalBody').innerHTML = `
        <div class="report-content">
            <div class="report-header">
                <h2>Spectrum Testing & Inspection</h2>
                <p>Test Report: ${reportNumber}</p>
            </div>
            <div class="report-meta">
                <div class="report-meta-item">
                    <span class="report-meta-label">Report Number</span>
                    <span class="report-meta-value">${reportNumber}</span>
                </div>
                <div class="report-meta-item">
                    <span class="report-meta-label">Date</span>
                    <span class="report-meta-value">${new Date().toLocaleDateString()}</span>
                </div>
            </div>
            <div class="report-results">
                <h4>Test Results</h4>
                <p style="text-align: center; color: var(--gray-500); padding: 2rem;">
                    Full report content will be displayed here
                </p>
            </div>
        </div>
    `;
    document.getElementById('reportModal').classList.add('active');
}

function closeReportModal() {
    document.getElementById('reportModal').classList.remove('active');
}

function printReport() {
    window.print();
}

// Navigation
function navigateTo(page) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === 'page-' + page);
    });

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        samples: 'My Samples',
        'new-sample': 'Submit New Sample',
        reports: 'Test Reports',
        profile: 'My Profile'
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
