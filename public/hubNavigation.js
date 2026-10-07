document.addEventListener('DOMContentLoaded', async () => {
    const headerContainer = document.querySelector('.header-container');

    if (!headerContainer) return;

    let hubContainer = document.getElementById('hub-navigation');
    if (!hubContainer) {
        hubContainer = document.createElement('div');
        hubContainer.id = 'hub-navigation';
        hubContainer.className = 'hub-navigation';
        headerContainer.appendChild(hubContainer);
    }

    try {
        const response = await fetch('/api/users/me', {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            // User is unauthenticated
            return;
        }

        const data = await response.json();
        const user = data.user || data;

        if (!user || !user.role) return;

        const role = user.role.toLowerCase();
        let buttonsHTML = '';

        // Dynamically filter & display Hub Menu options based on role
        if (['reporter', 'editor', 'admin'].includes(role)) {
            buttonsHTML += `<a href="/WritersHub" class="hub-btn writer-btn">✍️ Writer's Hub</a>`;
        }

        if (['editor', 'admin'].includes(role)) {
            buttonsHTML += `<a href="/EditorsHub" class="hub-btn editor-btn">📑 Editor's Hub</a>`;
        }

        if (role === 'admin') {
            buttonsHTML += `<a href="/AdminHub" class="hub-btn admin-btn">⚙️ Admin's Hub</a>`;
        }

        buttonsHTML += `
            <span class="user-badge" title="Logged in as ${user.username}">👤 ${user.username} (${user.role})</span>
            <button id="logout-btn" class="nav-btn logout-btn">Logout</button>
        `;

        hubContainer.innerHTML = buttonsHTML;

        // Logout action handler
        const logoutBtn = document.getElementById('logout-btn');
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
    } catch (err) {
        console.error('Failed to fetch user session for Hub navigation:', err);
    }
});
