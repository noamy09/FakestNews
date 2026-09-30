document.addEventListener('DOMContentLoaded', () => {

    let currentPage = 1;
    let hasMoreArticles = true;
    let isLoading = false;
    let searchDebounceTimeout = null;

    const articlesContainer = document.getElementById('articles-grid');
    const loadingSentinel = document.getElementById('scroll-sentinel');
    const statusMessage = document.getElementById('loading-text');

    const searchInput = document.getElementById('search-input') || document.querySelector('.filter-bar input');
    const categoryFilter = document.getElementById('category-filter') || document.querySelector('.filter-bar select:first-of-type');
    const sortFilter = document.getElementById('sort-filter') || document.getElementById('sortSelect');
    const readStatusFilter = document.getElementById('status-filter') || document.getElementById('read-filter') || document.querySelector('.filter-bar select:last-of-type');

    if (!articlesContainer) {
        console.error('articles-grid container not found in DOM');
        return;
    }

    const setStatus = (text, isVisible = true, isError = false) => {
        if (!statusMessage) return;
        statusMessage.textContent = text;
        statusMessage.style.display = isVisible ? 'block' : 'none';
        statusMessage.style.color = isError ? '#ef4444' : '';
    };

    const getReadArticleIds = () => {
        try {
            return JSON.parse(localStorage.getItem('readArticles')) || [];
        } catch (e) {
            return [];
        }
    };

    const markArticleAsReadInStorage = (id) => {
        const readIds = getReadArticleIds();
        if (!readIds.includes(id)) {
            readIds.push(id);
            localStorage.setItem('readArticles', JSON.stringify(readIds));
        }
    };

    const createArticleCard = (article) => {
        const readIds = getReadArticleIds();
        const isRead = readIds.includes(article._id);

        const card = document.createElement('article');
        card.className = `article-card ${isRead ? 'read' : 'unread'}`;
        card.setAttribute('data-id', article._id);

        const authorName = article.author?.name || article.author || 'Anonymous';
        const formattedDate = article.createdAt 
            ? new Date(article.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';

        card.innerHTML = `
            <div class="article-category">${article.category || 'General'}</div>
            <h2 class="article-title">
                <a href="/articles/view/${article._id}" class="article-link">${article.title}</a>
            </h2>
            <p class="article-summary">${article.content ? article.content.substring(0, 150) + '...' : ''}</p>
            <div class="article-meta">
                <span class="article-author">By ${authorName}</span>
                <span class="article-date">${formattedDate}</span>
                <span class="article-views">${article.views || 0} views</span>
            </div>
        `;

        const link = card.querySelector('.article-link');
        if (link) {
            link.addEventListener('click', () => {
                markArticleAsReadInStorage(article._id);
                card.classList.remove('unread');
                card.classList.add('read');
            });
        }

        return card;
    };

    const applyReadFilter = () => {
        const selectedFilter = readStatusFilter ? readStatusFilter.value : 'all';
        const cards = articlesContainer.querySelectorAll('.article-card');
        const readIds = getReadArticleIds();

        cards.forEach((card) => {
            const articleId = card.getAttribute('data-id');
            const isRead = readIds.includes(articleId);

            if (selectedFilter === 'all') {
                card.style.display = '';
            } else if (selectedFilter === 'read') {
                card.style.display = isRead ? '' : 'none';
            } else if (selectedFilter === 'unread') {
                card.style.display = !isRead ? '' : 'none';
            }
        });
    };

    const fetchArticles = async (resetList = false) => {
        if (isLoading || (!hasMoreArticles && !resetList)) return;

        isLoading = true;
        setStatus('Loading more articles...', true, false);

        if (resetList) {
            currentPage = 1;
            hasMoreArticles = true;
            articlesContainer.innerHTML = '';
        }

        const query = new URLSearchParams({
            page: currentPage,
            limit: 20
        });

        const categoryVal = categoryFilter ? categoryFilter.value : '';
        const searchVal = searchInput ? searchInput.value.trim() : '';
        const sortVal = sortFilter ? sortFilter.value : 'newest';

        if (categoryVal && categoryVal !== 'all') query.append('category', categoryVal);
        if (searchVal) query.append('search', searchVal);
        if (sortVal) query.append('sort', sortVal);

        try {
            let res = await fetch(`/api/articles?${query.toString()}`, {
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
                res = await fetch(`/articles?${query.toString()}`, {
                    headers: { 'Accept': 'application/json' }
                });
            }

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('Server returned HTML instead of JSON API response.');
            }

            const result = await res.json();
            const articles = Array.isArray(result) 
                ? result 
                : (result.data || result.articles || []);

            if (articles.length === 0 && resetList) {
                setStatus('No articles found.', true, false);
            } else {
                articles.forEach((article) => {
                    const card = createArticleCard(article);
                    articlesContainer.appendChild(card);
                });
                setStatus('', false, false);
            }

            applyReadFilter();

            const pagination = result.pagination;
            if (pagination && pagination.hasNextPage !== undefined) {
                hasMoreArticles = Boolean(pagination.hasNextPage);
            } else {
                hasMoreArticles = articles.length === 20;
            }

            if (hasMoreArticles) {
                currentPage += 1;
            } else if (articlesContainer.children.length > 0) {
                setStatus('No more articles', true, false);
            }
        } catch (error) {
            console.error('Error fetching articles:', error);
            if (resetList) {
                setStatus('Failed to load articles. Please check server logs.', true, true);
            }
        } finally {
            isLoading = false;
        }
    };

    if (loadingSentinel) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMoreArticles && !isLoading) {
                fetchArticles(false);
            }
        }, {
            rootMargin: '200px'
        });

        observer.observe(loadingSentinel);
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimeout);
            searchDebounceTimeout = setTimeout(() => {
                fetchArticles(true);
            }, 300);
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            fetchArticles(true);
        });
    }

    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            fetchArticles(true);
        });
    }

    if (readStatusFilter) {
        readStatusFilter.addEventListener('change', () => {
            applyReadFilter();
        });
    }

    fetchArticles(true);
});