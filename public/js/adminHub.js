// Cache for DOM elements to avoid repeated lookups
const els = {};
// Tracks previous role selection to allow cancellation of elevated role change
let previousRole = 'reporter';
// Debounce timer identifier for user search input
let searchTimer = null;

// Initialize event listeners and fetch initial data when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Cache form and control elements
    els.form = document.getElementById('create-user-form');
    els.role = document.getElementById('role');
    els.warning = document.getElementById('admin-role-warning');
    els.createAlert = document.getElementById('create-alert');
    els.submitBtn = document.getElementById('create-submit-btn');
    els.modal = document.getElementById('admin-confirm-modal');
    els.searchForm = document.getElementById('search-form');
    els.searchInput = document.getElementById('search-input');
    els.roleFilter = document.getElementById('role-filter');
    els.usersAlert = document.getElementById('users-alert');
    els.tbody = document.getElementById('users-tbody');
    els.empty = document.getElementById('users-empty');

    // Attach role change and confirmation modal event handlers
    els.role.addEventListener('change', onRoleChange);
    document.getElementById('admin-modal-confirm').addEventListener('click', () => closeAdminModal(true));
    document.getElementById('admin-modal-cancel').addEventListener('click', () => closeAdminModal(false));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !els.modal.hidden) closeAdminModal(false);
    });

    // Form submission for creating a new user
    els.form.addEventListener('submit', onCreateUser);

    // Search and filter event handlers
    els.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        fetchUsers();
    });
    // Debounce search input to avoid excessive API requests
    els.searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(fetchUsers, 300);
    });
    els.roleFilter.addEventListener('change', fetchUsers);

    // Event delegation for table action buttons (e.g., delete user)
    els.tbody.addEventListener('click', onTableClick);

    // Load initial users list
    fetchUsers();
});

/**
 * Handles role dropdown change.
 * Displays a confirmation modal when selecting the 'admin' role to prevent accidental privilege escalation.
 */
function onRoleChange() {
    if (els.role.value === 'admin') {
        els.modal.hidden = false;
        document.getElementById('admin-modal-cancel').focus();
    } else {
        previousRole = els.role.value;
        updateAdminWarning();
    }
}

/**
 * Closes the admin confirmation modal and either commits or reverts the selection.
 *
 * @param {boolean} confirmed - True if the admin elevation was confirmed; false otherwise.
 */
function closeAdminModal(confirmed) {
    els.modal.hidden = true;
    if (confirmed) {
        previousRole = 'admin';
    } else {
        els.role.value = previousRole;
    }
    updateAdminWarning();
    els.role.focus();
}

/**
 * Updates UI indicators and warning banners based on whether 'admin' role is currently chosen.
 */
function updateAdminWarning() {
    const isAdmin = els.role.value === 'admin';
    els.warning.hidden = !isAdmin;
    els.role.classList.toggle('role-admin-selected', isAdmin);
    els.submitBtn.textContent = isAdmin ? 'Create Admin User' : 'Create User';
    els.submitBtn.classList.toggle('btn-danger', isAdmin);
    els.submitBtn.classList.toggle('btn-primary', !isAdmin);
}

/**
 * Displays an alert banner with a custom message and style.
 *
 * @param {HTMLElement} el - Alert container element.
 * @param {string} message - Message text to display.
 * @param {'success'|'error'} type - CSS modifier type for status style.
 */
function showAlert(el, message, type) {
    el.textContent = message;
    el.className = `admin-alert admin-alert-${type}`;
    el.style.display = 'block';
}

/**
 * Hides an alert banner element.
 *
 * @param {HTMLElement} el - Alert container element to hide.
 */
function hideAlert(el) {
    el.style.display = 'none';
}

/**
 * Helper to safely extract error message from API response JSON or return a fallback.
 *
 * @param {Response} res - Fetch Response object.
 * @param {string} fallback - Default message if parsing fails.
 * @returns {Promise<string>} Resolved error message string.
 */
async function readError(res, fallback) {
    try {
        const data = await res.json();
        return data.message || fallback;
    } catch {
        return fallback;
    }
}

/**
 * Handles user creation form submission, validates inputs, and sends POST request to API.
 *
 * @param {Event} e - Form submission event.
 */
async function onCreateUser(e) {
    e.preventDefault();
    hideAlert(els.createAlert);

    // Prepare payload from form inputs
    const payload = {
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        role: els.role.value
    };

    els.submitBtn.disabled = true;
    try {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await readError(res, 'Failed to create user.'));

        const data = await res.json();
        showAlert(els.createAlert, `User "${data.user.username}" created as ${data.user.role}.`, 'success');
        
        // Reset form and UI state back to default reporter
        els.form.reset();
        previousRole = 'reporter';
        updateAdminWarning();
        fetchUsers();
    } catch (err) {
        showAlert(els.createAlert, err.message, 'error');
    } finally {
        els.submitBtn.disabled = false;
    }
}

/**
 * Fetches users list from the server filtered by search query and role.
 */
async function fetchUsers() {
    const params = new URLSearchParams();
    const q = els.searchInput.value.trim();
    if (q) params.set('q', q);
    if (els.roleFilter.value) params.set('role', els.roleFilter.value);

    try {
        const res = await fetch(`/api/users?${params}`, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error(await readError(res, 'Failed to load users.'));
        const users = await res.json();
        hideAlert(els.usersAlert);
        renderUsers(users);
    } catch (err) {
        showAlert(els.usersAlert, err.message, 'error');
    }
}

/**
 * Renders user rows into the table body element.
 *
 * @param {Array<Object>} users - Array of user objects returned by the API.
 */
function renderUsers(users) {
    els.tbody.innerHTML = '';
    els.empty.hidden = users.length > 0;

    users.forEach(user => {
        const tr = document.createElement('tr');
        const isSelf = user._id === window.currentUserId;

        // Data for each respective column
        const cells = [
            user.username + (isSelf ? ' (you)' : ''),
            user.email,
            null, // Handled separately as role badge
            new Date(user.createdAt).toLocaleDateString()
        ];
        cells.forEach((text, i) => {
            const td = document.createElement('td');
            if (i === 2) {
                // Construct role badge pill
                const badge = document.createElement('span');
                badge.className = `role-badge role-${user.role}`;
                badge.textContent = user.role;
                td.appendChild(badge);
            } else {
                td.textContent = text;
            }
            tr.appendChild(td);
        });

        // Add action button column (prevent self-deletion)
        const actionTd = document.createElement('td');
        if (!isSelf) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-danger btn-small';
            btn.textContent = 'Delete';
            btn.dataset.id = user._id;
            btn.dataset.username = user.username;
            actionTd.appendChild(btn);
        }
        tr.appendChild(actionTd);

        els.tbody.appendChild(tr);
    });
}

/**
 * Handles click events on table action buttons via event delegation to delete a user.
 *
 * @param {MouseEvent} e - Click event target.
 */
async function onTableClick(e) {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;

    // Confirm deletion before making request
    if (!confirm(`Delete user "${btn.dataset.username}"? This cannot be undone.`)) return;

    btn.disabled = true;
    try {
        const res = await fetch(`/api/users/${btn.dataset.id}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error(await readError(res, 'Failed to delete user.'));
        showAlert(els.usersAlert, `User "${btn.dataset.username}" deleted.`, 'success');
        fetchUsers();
    } catch (err) {
        showAlert(els.usersAlert, err.message, 'error');
        btn.disabled = false;
    }
}