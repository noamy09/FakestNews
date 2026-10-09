document.addEventListener('DOMContentLoaded', async () => {
    function openSidebar() {
        const sidebarMenu = document.getElementById('sidebar-menu');
        const sidebarBackdrop = document.getElementById('sidebar-backdrop');
        if (sidebarMenu) sidebarMenu.classList.add('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.add('open');
    }

    function closeSidebar() {
        const sidebarMenu = document.getElementById('sidebar-menu');
        const sidebarBackdrop = document.getElementById('sidebar-backdrop');
        if (sidebarMenu) sidebarMenu.classList.remove('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.remove('open');
    }

    document.addEventListener('click', (e) => {
        // Open hub
        const hubBtn = e.target.closest('#role-menu-btn');
        if (hubBtn) {
            e.preventDefault();
            e.stopPropagation();
            openSidebar();
            return;
        }

        // Close by X
        const closeBtn = e.target.closest('#close-sidebar-btn');
        if (closeBtn) {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
            return;
        }

        // Backdrop
        const backdrop = e.target.closest('#sidebar-backdrop');
        if (backdrop) {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
            return;
        }
    }, true);

    // 2. Auth State Check via API & Dynamic UI Update
    const loginBtn = document.getElementById('header-login-btn');
    const logoutBtn = document.getElementById('header-logout-btn');
    const roleMenuBtn = document.getElementById('role-menu-btn');
    const headerActions = document.getElementById('header-actions');

    const itemWriterHub = document.getElementById('item-writer-hub');
    const itemEditorHub = document.getElementById('item-editor-hub');
    const itemAdminHub = document.getElementById('item-admin-hub');
    const hubUserInfo = document.getElementById('hub-user-info');

    try {
        const res = await fetch('/api/users/me', {
            headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
            const data = await res.json();
            const user = data.user || data.data || data;
            const role = String(user?.role || '').toLowerCase();

            if (role) {
                if (loginBtn) loginBtn.style.display = 'none';
                if (roleMenuBtn) roleMenuBtn.style.display = 'flex';
                if (logoutBtn) logoutBtn.style.display = 'inline-flex';

                if (hubUserInfo) {
                    hubUserInfo.style.display = 'block';
                    hubUserInfo.innerHTML = `Logged in as <strong>${role}</strong> (${user.username || user.name || ''})`;
                }

                if (['writer', 'reporter', 'editor', 'admin'].includes(role) && itemWriterHub) {
                    itemWriterHub.style.display = 'block';
                }
                if (['editor', 'admin'].includes(role) && itemEditorHub) {
                    itemEditorHub.style.display = 'block';
                }
                if (role === 'admin' && itemAdminHub) {
                    itemAdminHub.style.display = 'block';
                }
            }
        }
    } catch (err) {
        console.error('Auth check error:', err);
    } finally {
        if (headerActions) {
            headerActions.style.opacity = '1';
        }
    }

    // 3. Logout Request Handling
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/users/logout', {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' }
                });
            } catch (err) {
                console.error('Logout error:', err);
            } finally {
                window.location.href = '/';
            }
        });
    }
});