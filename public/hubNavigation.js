document.addEventListener('DOMContentLoaded', async () => {
    // Select Hub menu link elements
    const writerLink = document.getElementById('hub-writer-link') || document.querySelector('a[href="/WritersHub"]');
    const editorLink = document.getElementById('hub-editor-link') || document.querySelector('a[href*="Editor"]');
    const adminLink = document.getElementById('hub-admin-link') || document.querySelector('a[href*="Admin"]');
    const userSection = document.getElementById('hub-user-section');

    const setLinkState = (linkElement, isEnabled, targetHref, label) => {
        if (!linkElement) return;
        if (isEnabled) {
            linkElement.href = targetHref;
            linkElement.classList.remove('disabled-link');
            linkElement.removeAttribute('title');
            linkElement.removeAttribute('aria-disabled');
            if (label) linkElement.textContent = label;
        } else {
            linkElement.href = '#';
            linkElement.classList.add('disabled-link');
            linkElement.setAttribute('aria-disabled', 'true');
            linkElement.setAttribute('title', 'Insufficient permissions for this hub');
            if (label) linkElement.textContent = label;
            
            // Prevent default navigation when clicked while disabled
            linkElement.onclick = (e) => {
                e.preventDefault();
                return false;
            };
        }
    };

    try {
        const response = await fetch('/api/users/me', {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            // Unauthenticated: keep hubs disabled, optionally show login link
            setLinkState(writerLink, false, '/WritersHub', "Writer's Hub (Login Required)");
            setLinkState(editorLink, false, '/EditorsHub', "Editor's Hub (Login Required)");
            setLinkState(adminLink, false, '/AdminHub', "Admin's Hub (Login Required)");

            if (userSection) {
                userSection.innerHTML = `
                    <a href="/login" class="nav-btn login-btn" style="display: block; text-align: center; margin-top: 1rem;">🔑 Login</a>
                `;
            }
            return;
        }

        const data = await response.json();
        const user = data.user || data;

        if (!user || !user.role) return;

        const role = user.role.toLowerCase();

        // Role Permission Matrix:
        // - reporter (writer): Writer's Hub enabled
        // - editor: Writer's Hub + Editor's Hub enabled
        // - admin: Writer's Hub + Editor's Hub + Admin's Hub enabled
        const canAccessWriter = ['reporter', 'editor', 'admin', 'writer'].includes(role);
        const canAccessEditor = ['editor', 'admin'].includes(role);
        const canAccessAdmin = role === 'admin';

        setLinkState(writerLink, canAccessWriter, '/WritersHub', "Writer's Hub");
        setLinkState(editorLink, canAccessEditor, '/EditorsHub', "Editor's Hub");
        setLinkState(adminLink, canAccessAdmin, '/AdminHub', "Admin's Hub");

        if (userSection) {
            userSection.innerHTML = `
                <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem; text-align: center;">
                    Logged in as <strong>${user.username}</strong> (${user.role})
                </div>
                <button id="sidebar-logout-btn" style="width: 100%; padding: 0.6rem; background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    Logout
                </button>
            `;

            const logoutBtn = document.getElementById('sidebar-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    try {
                        await fetch('/api/users/logout', { method: 'POST' });
                        window.location.href = '/';
                    } catch (e) {
                        console.error('Logout error:', e);
                    }
                });
            }
        }
    } catch (err) {
        console.error('Failed to fetch user session for Hub navigation:', err);
    }
});
