const els = {};
let previousRole = 'reporter';
let searchTimer = null;

document.addEventListener('DOMContentLoaded', () => {
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

    els.role.addEventListener('change', onRoleChange);
    document.getElementById('admin-modal-confirm').addEventListener('click', () => closeAdminModal(true));
    document.getElementById('admin-modal-cancel').addEventListener('click', () => closeAdminModal(false));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !els.modal.hidden) closeAdminModal(false);
    });

    els.form.addEventListener('submit', onCreateUser);

    els.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        fetchUsers();
    });
    els.searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(fetchUsers, 300);
    });
    els.roleFilter.addEventListener('change', fetchUsers);

    els.tbody.addEventListener('click', onTableClick);

    fetchUsers();
});

// Admin role warning: confirm via modal on selection, then keep a visible banner while selected
function onRoleChange() {
    if (els.role.value === 'admin') {
        els.modal.hidden = false;
        document.getElementById('admin-modal-cancel').focus();
    } else {
        previousRole = els.role.value;
        updateAdminWarning();
    }
}

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

function updateAdminWarning() {
    const isAdmin = els.role.value === 'admin';
    els.warning.hidden = !isAdmin;
    els.role.classList.toggle('role-admin-selected', isAdmin);
    els.submitBtn.textContent = isAdmin ? 'Create Admin User' : 'Create User';
    els.submitBtn.classList.toggle('btn-danger', isAdmin);
    els.submitBtn.classList.toggle('btn-primary', !isAdmin);
}

function showAlert(el, message, type) {
    el.textContent = message;
    el.className = `admin-alert admin-alert-${type}`;
    el.style.display = 'block';
}

function hideAlert(el) {
    el.style.display = 'none';
}

async function readError(res, fallback) {
    try {
        const data = await res.json();
        return data.message || fallback;
    } catch {
        return fallback;
    }
}

async function onCreateUser(e) {
    e.preventDefault();
    hideAlert(els.createAlert);

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

function renderUsers(users) {
    els.tbody.innerHTML = '';
    els.empty.hidden = users.length > 0;

    users.forEach(user => {
        const tr = document.createElement('tr');
        const isSelf = user._id === window.currentUserId;

        const cells = [
            user.username + (isSelf ? ' (you)' : ''),
            user.email,
            null,
            new Date(user.createdAt).toLocaleDateString()
        ];
        cells.forEach((text, i) => {
            const td = document.createElement('td');
            if (i === 2) {
                const badge = document.createElement('span');
                badge.className = `role-badge role-${user.role}`;
                badge.textContent = user.role;
                td.appendChild(badge);
            } else {
                td.textContent = text;
            }
            tr.appendChild(td);
        });

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

async function onTableClick(e) {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;

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
