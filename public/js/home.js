document.addEventListener('DOMContentLoaded', () => {

    // Pagination and state management variables
    let currentPage = 1;
    let hasMoreArticles = true;
    let isLoading = false;
    let searchDebounceTimeout = null;

    // Cache DOM containers for feed and status indicators
    const articlesContainer = document.getElementById('articles-grid');
    const loadingSentinel = document.getElementById('scroll-sentinel');
    const statusMessage = document.getElementById('loading-state');

    // Cache filter controls with fallback selectors
    const searchInput = document.getElementById('search-input') || document.querySelector('.filter-bar input');
    const categoryFilter = document.getElementById('category-filter') || document.querySelector('.filter-bar select:first-of-type');
    const sortFilter = document.getElementById('sort-filter') || document.getElementById('sortSelect');
    const readStatusFilter = document.getElementById('status-filter') || document.getElementById('read-filter') || document.querySelector('.filter-bar select:last-of-type');

    // Abort execution if the primary feed container is missing from the DOM
    if (!articlesContainer) {
        console.error('articles-grid container not found in DOM');
        return;
    }

    /**
     * Updates and toggles the visibility and styling of the loading/status message banner.
     *
     * @param {string} text - Message to display
     * @param {boolean} [isVisible=true] - Visibility toggle
     * @param {boolean} [isError=false] - Error styling flag
     */
    const setStatus = (text, isVisible = true, isError = false) => {
        if (!statusMessage) return;
        statusMessage.textContent = text;
        statusMessage.style.display = isVisible ? 'block' : 'none';
        statusMessage.style.color = isError ? '#ef4444' : '';
    };

    /**
     * Fetches distinct categories from the API and populates the category dropdown filter.
     */
    const loadCategories = async () => {
        if (!categoryFilter) return;

        try {
            const res = await fetch('/api/articles/categories', {
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch categories: ${res.status}`);
            }

            const categories = await res.json();

            // Reset dropdown to default option
            categoryFilter.innerHTML = '<option value="all">All Categories</option>';

            // Append each retrieved category option
            if (Array.isArray(categories)) {
                categories.forEach((cat) => {
                    if (cat && typeof cat === 'string') {
                        const option = document.createElement('option');
                        option.value = cat;
                        option.textContent = cat;
                        categoryFilter.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading dynamic categories:', error);
        }
    };

    /**
     * Retrieves the array of read article IDs from localStorage.
     *
     * @returns {string[]} Array of read article ID strings
     */
    const getReadArticleIds = () => {
        try {
            return JSON.parse(localStorage.getItem('readArticles')) || [];
        } catch (e) {
            return [];
        }
    };

    /**
     * Persists an article ID to the read list in localStorage.
     *
     * @param {string} id - Article ObjectId string
     */
    const markArticleAsReadInStorage = (id) => {
        const readIds = getReadArticleIds();
        if (!readIds.includes(id)) {
            readIds.push(id);
            localStorage.setItem('readArticles', JSON.stringify(readIds));
        }
    };

    /**
     * Generates a DOM element representing an article feed card.
     *
     * @param {Object} article - The article data object
     * @returns {HTMLElement} Article card DOM element
     */
    const createArticleCard = (article) => {
        const readIds = getReadArticleIds();
        const isRead = readIds.includes(article._id);

        // Create main container card element
        const card = document.createElement('article');
        card.className = `article-card ${isRead ? 'read' : 'unread'}`;
        card.setAttribute('data-id', article._id);

        // Resolve author name and creation date format
        const authorName = article.author.username;
        const formattedDate = article.createdAt 
            ? new Date(article.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
            : '';

        const imageUrl = article.imageUrl || '/images/placeholder.jpg';

        // Populate inner HTML template
        card.innerHTML = `
            <img src="${imageUrl}" onerror="this.onerror=null; this.src='/images/placeholder.jpg';" alt="${article.title}">
            <div class="card-content">
                <span class="badge">${article.category || 'General'}</span>
                <h2><a href="/articles/${article._id}" class="article-link">${article.title}</a></h2>
                <p class="summary">${article.summary || (article.content ? article.content.substring(0, 150) + '...' : '')}</p>
                <div class="card-meta">
                    <span>By: ${authorName}</span>
                    <span>${formattedDate}</span>
                </div>
            </div>
        `;

        // Mark article as read when clicking through to the single view
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

    /**
     * Filters currently rendered article cards based on the read/unread filter dropdown.
     */
    const applyReadFilter = () => {
        const selectedFilter = readStatusFilter.value;
        const cards = articlesContainer.querySelectorAll('.article-card');
        const readIds = getReadArticleIds();

        let visibleCount = 0;

        cards.forEach((card) => {
            const articleId = card.getAttribute('data-id');
            const isRead = readIds.includes(articleId);

            if (selectedFilter === 'all') {
                card.style.display = '';
                visibleCount++;
            } else if (selectedFilter === 'read') {
                const show = isRead;
                card.style.display = show ? '' : 'none';
                if (show) visibleCount++;
            } else if (selectedFilter === 'unread') {
                const show = !isRead;
                card.style.display = show ? '' : 'none';
                if (show) visibleCount++;
            }
        });

        // Update status indicator based on remaining visible items
        if (visibleCount === 0) {
            setStatus('No articles found.', true, false);
        } else if (!hasMoreArticles) {
            setStatus('No more articles', true, false);
        } else {
            setStatus('', false, false);
        }
    };

    /**
     * Fetches paginated articles from the server based on current filters.
     *
     * @param {boolean} [resetList=false] - True to clear container and start from page 1
     */
    const fetchArticles = async (resetList = false) => {
        if (isLoading || (!hasMoreArticles && !resetList)) return;

        isLoading = true;
        setStatus('Loading more articles...', true, false);

        // Reset feed state if triggered by filter or search changes
        if (resetList) {
            currentPage = 1;
            hasMoreArticles = true;
            articlesContainer.innerHTML = '';
        }

        // Build query string parameters
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
            // Request JSON articles response from public feed endpoint
            const res = await fetch(`/?${query.toString()}`, {
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) {
                throw new Error(`Server returned status: ${res.status}`);
            }

            const result = await res.json();
            const articles = result.articles || (Array.isArray(result) ? result : (result.data || []));

            // Append cards or display empty state
            if (articles.length === 0 && resetList) {
                setStatus('No articles found.', true, false);
            } else {
                articles.forEach((article) => {
                    const card = createArticleCard(article);
                    articlesContainer.appendChild(card);
                });
                setStatus('', false, false);
            }

            // Apply client-side read/unread visibility filter
            applyReadFilter();

            // Evaluate pagination indicators to check if next pages exist
            const pagination = result.pagination;
            if (pagination && pagination.hasNextPage !== undefined) {
                hasMoreArticles = Boolean(pagination.hasNextPage);
            } else {
                hasMoreArticles = articles.length === 20;
            }

            // Increment page counter or display completion message
            if (hasMoreArticles) {
                currentPage += 1;
            } else if (articlesContainer.children.length > 0) {
                setStatus('No more articles.', true, false);
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

    // Initialize IntersectionObserver on sentinel element for infinite scrolling
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

    // Debounced search input handler to prevent spamming requests on keystrokes
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimeout);
            searchDebounceTimeout = setTimeout(() => {
                fetchArticles(true);
            }, 300);
        });
    }

    // Refresh feed on category filter change
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            fetchArticles(true);
        });
    }

    // Refresh feed on sorting order change
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            fetchArticles(true);
        });
    }

    // Apply read filter client-side on status change
    if (readStatusFilter) {
        readStatusFilter.addEventListener('change', () => {
            applyReadFilter();
        });
    }

    // Initial data fetch and category setup on load
    loadCategories();
    fetchArticles(true);
});