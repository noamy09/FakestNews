const containers = {};

document.addEventListener('DOMContentLoaded', () => {//verification that the DOM is loaded before fetching articles
    containers.draft = document.getElementById('content-draft');
    containers.rejected = document.getElementById('content-rejected');
    containers.pending = document.getElementById('content-pending');
    containers.published = document.getElementById('content-published');

    fetchArticles();
});

async function fetchArticles() {//fetching articles from the DB
    try {
        const res = await fetch(`/api/articles?author=${window.currentUserId}&limit=1000`);
        const result = await res.json();
        const articles = result.data || result || [];
        
        renderPillars(articles);
    } catch (err) {
        console.error('Failed to fetch articles:', err);
    }
}

function renderPillars(articles) {
    containers.draft.innerHTML = '';
    containers.rejected.innerHTML = '';
    containers.pending.innerHTML = '';
    containers.published.innerHTML = '';

    articles.forEach(article => {
        const isPublished = article.status === 'published';
        const hasDraft = article.draft && article.draft.status;
        
        if (isPublished) {
            containers.published.appendChild(createArticleCard(article));
        }

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

            if (draftStatus === 'draft') {
                containers.draft.appendChild(createArticleCard(draftArticle));
            } else if (draftStatus === 'rejected') {
                containers.rejected.appendChild(createArticleCard(draftArticle));
            } else if (draftStatus === 'pending') {
                containers.pending.appendChild(createArticleCard(draftArticle));
            }
        } else if (!isPublished && article.status === 'unpublished') {
             containers.draft.appendChild(createArticleCard(article));
        }
    });
}

function createArticleCard(article) {
    const a = document.createElement('a');
    a.href = `/WritersHub/edit/${article._id}`;
    a.className = 'hub-article-card';
    
    const date = new Date(article.updatedAt || article.createdAt).toLocaleString();
    const views = article.views || 0;
    const category = article.category || 'Uncategorized';
    let imgUrl = article.imageUrl;
    if (!imgUrl || imgUrl === 'placeholder.jpg' || imgUrl === '/placeholder.jpg') {
        imgUrl = '/images/placeholder.jpg';
    }

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
