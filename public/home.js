let currentPage = 1;
let isLoading = false;
let hasMore = true;

const articlesGrid = document.getElementById('articlesGrid');
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const sortSelect = document.getElementById('sortSelect');
const statusFilter = document.getElementById('statusFilter');

let statusMessage = document.getElementById('feedStatusMessage');
if (!statusMessage) {
  statusMessage = document.createElement('div');
  statusMessage.id = 'feedStatusMessage';
  statusMessage.className = 'feed-status-message';
  statusMessage.style.textAlign = 'center';
  statusMessage.style.padding = '20px';
  statusMessage.style.color = '#64748b';
  statusMessage.style.fontSize = '0.95rem';

  const sentinelElement = document.getElementById('scrollSentinel');
  if (sentinelElement && sentinelElement.parentNode) {
    sentinelElement.parentNode.insertBefore(statusMessage, sentinelElement);
  } else {
    document.body.appendChild(statusMessage);
  }
}

async function loadArticles(reset = false) {
  if (isLoading || (!hasMore && !reset)) return;
  isLoading = true;

  if (reset) {
    currentPage = 1;
    hasMore = true;
    if (articlesGrid) articlesGrid.innerHTML = '';
  }

  statusMessage.textContent = 'Loading articles...';
  statusMessage.style.display = 'block';

  const query = new URLSearchParams({
    page: currentPage,
    limit: 20,
    search: searchInput ? searchInput.value.trim() : '',
    category: categorySelect ? categorySelect.value : '',
    sort: sortSelect ? sortSelect.value : ''
  });

  try {
    const res = await fetch(`/articles?${query.toString()}`);
    const data = await res.json();
    const articles = Array.isArray(data) ? data : (data.articles || []);

    if (!articles || articles.length === 0) {
      hasMore = false;
      if (reset && articlesGrid && articlesGrid.children.length === 0) {
        statusMessage.textContent = 'No articles found.';
      } else {
        statusMessage.textContent = 'No more articles';
      }
      return;
    }

    renderArticles(articles);
    currentPage++;

    if (articles.length < 20) {
      hasMore = false;
      statusMessage.textContent = 'No more articles';
    } else {
      statusMessage.style.display = 'none';
    }
  } catch (err) {
    console.error('Failed to load articles from API:', err);
    statusMessage.textContent = 'Error loading articles.';
  } finally {
    isLoading = false;
  }
}

function renderArticles(articles) {
  if (!articlesGrid) return;
  const readList = JSON.parse(localStorage.getItem('readArticles') || '[]');

  articles.forEach(article => {
    const isRead = readList.includes(article._id);

    if (statusFilter && statusFilter.value === 'read' && !isRead) return;
    if (statusFilter && statusFilter.value === 'unread' && isRead) return;

    const card = document.createElement('article');
    card.className = `article-card ${isRead ? 'read' : ''}`;
    card.innerHTML = `
      <a href="/articles/${article._id}">
        <img src="${article.image || '/images/default.jpg'}" alt="${article.title || 'Article image'}">
        <div class="card-content">
          <span class="category-badge">${article.category || 'General'}</span>
          <h3>${article.title || ''}</h3>
          <p>${article.description || ''}</p>
          <div class="card-footer">
            <span>👁️ ${article.views || 0} views</span>
          </div>
        </div>
      </a>
    `;
    articlesGrid.appendChild(card);
  });
}

// Infinite scroll with IntersectionObserver
const sentinel = document.getElementById('scrollSentinel');
if (sentinel) {
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && hasMore && !isLoading) {
      loadArticles();
    }
  }, { rootMargin: '200px' });
  observer.observe(sentinel);
}

let debounceTimer;
if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadArticles(true), 300);
  });
}

if (categorySelect) categorySelect.addEventListener('change', () => loadArticles(true));
if (sortSelect) sortSelect.addEventListener('change', () => loadArticles(true));
if (statusFilter) statusFilter.addEventListener('change', () => loadArticles(true));

loadArticles(true);