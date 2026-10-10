// Cache object for dashboard pillar container elements
const containers = {};

// Wait for the DOM to fully load before initializing dashboard elements and fetching articles
document.addEventListener('DOMContentLoaded', () => {//verification that the DOM is loaded before fetching articles
    // Map column containers by status
    containers.draft = document.getElementById('content-draft');
    containers.rejected = document.getElementById('content-rejected');
    containers.pending = document.getElementById('content-pending');
    containers.published = document.getElementById('content-published');

    // Retrieve articles authored by the current user
    fetchArticles();
});

/**
 * Fetches all articles created by the authenticated writer from the REST API.
 */
async function fetchArticles() {//fetching articles from the DB
    try {
        // Request articles filtered by current user's ID
        const res = await fetch(`/api/articles?author=${window.currentUserId}&limit=1000`);
        const result = await res.json();
        const articles = result.data || result || [];
        
        // Distribute and render articles into their respective status columns
        renderPillars(articles);
    } catch (err) {
        console.error('Failed to fetch articles:', err);
    }
}

/**
 * Distributes articles into workflow columns (Draft, Rejected, Pending, Published).
 * Supports articles that are simultaneously published while having a pending or draft revision.
 *
 * @param {Array<Object>} articles - List of article documents
 */
function renderPillars(articles) {
    // Clear existing content in each column before rendering
    containers.draft.innerHTML = '';
    containers.rejected.innerHTML = '';
    containers.pending.innerHTML = '';
    containers.published.innerHTML = '';

    articles.forEach(article => {
        const isPublished = article.status === 'published';
        const hasDraft = article.draft && article.draft.status;
        
        // Place the live published version in the published column
        if (isPublished) {
            containers.published.appendChild(createArticleCard(article));
        }

        // If a separate draft or revision exists, route it according to its specific workflow status
        if (hasDraft) {
            const draftStatus = article.draft.status;
            const draftArticle = {
                _id: article._id,
                title: article.draft.title || article.title,
                category: article.draft.category || article.category,
                imageUrl: article.draft.imageUrl || article.imageUrl,
                views: article.views,
                updatedAt: article.updatedAt || article.createdAt
            };

            // Route draft revision to its appropriate status pillar
            if (draftStatus === 'draft') {
                containers.draft.appendChild(createArticleCard(draftArticle));
            } else if (draftStatus === 'rejected') {
                containers.rejected.appendChild(createArticleCard(draftArticle));
            } else if (draftStatus === 'pending') {
                containers.pending.appendChild(createArticleCard(draftArticle));
            }
        } else if (!isPublished && article.status === 'unpublished') {
            // Treat unpublished base articles without drafts as standard drafts
             containers.draft.appendChild(createArticleCard(article));
        }
    });
}

/**
 * Creates and returns an interactive article card element linking to the editor.
 *
 * @param {Object} article - Article or draft data object
 * @returns {HTMLAnchorElement} Rendered clickable card element
 */
function createArticleCard(article) {
    // Anchor link pointing to the article edit page
    const a = document.createElement('a');
    a.href = `/WritersHub/edit/${article._id}`;
    a.className = 'hub-article-card';
    
    // Format timestamp, view counts, and fallback category
    const date = new Date(article.updatedAt || article.createdAt).toLocaleString();
    const views = article.views || 0;
    const category = article.category || 'Uncategorized';
    
    // Normalize image URL and provide fallback placeholder
    let imgUrl = article.imageUrl;
    if (!imgUrl || imgUrl === 'placeholder.jpg' || imgUrl === '/placeholder.jpg') {
        imgUrl = '/images/placeholder.jpg';
    }

    // Populate article card markup
    a.innerHTML = `
        <img src="${imgUrl}" alt="${article.title}">
        <span class="badge">${category}</span>
        <h3>${article.title || 'Untitled'}</h3>
        <div class="meta">
            <span>Views: ${views}</span>
            <span>Updated: ${date}</span>
        </div>
    `;
    
    return a;
}