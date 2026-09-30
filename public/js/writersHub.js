document.addEventListener('DOMContentLoaded', () => { //verification that the DOM is loaded before fetching articles
    fetchArticles();
});

async function fetchArticles() { //fetching articles from the DB
    try {
        const res = await fetch('/api/articles?limit=1000');
        const result = await res.json();
        const articles = result.data || result || [];
        
        renderPillars(articles);
    } catch (err) {
        console.error('Failed to fetch articles:', err);
    }
}

function renderPillars(articles) {
    const draftContainer = document.querySelector('#pillar-draft .pillar-content');
    const rejectedContainer = document.querySelector('#pillar-rejected .pillar-content');
    const pendingContainer = document.querySelector('#pillar-pending .pillar-content');
    const publishedContainer = document.querySelector('#pillar-published .pillar-content');

    draftContainer.innerHTML = '';
    rejectedContainer.innerHTML = '';
    pendingContainer.innerHTML = '';
    publishedContainer.innerHTML = '';

    articles.forEach(article => {
        const isPublished = article.status === 'published';
        const hasDraft = article.draft && article.draft.status;
        
        if (isPublished) {
            publishedContainer.appendChild(createArticleCard(article));
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
                draftContainer.appendChild(createArticleCard(draftArticle));
            } else if (draftStatus === 'rejected') {
                rejectedContainer.appendChild(createArticleCard(draftArticle));
            } else if (draftStatus === 'pending') {
                pendingContainer.appendChild(createArticleCard(draftArticle));
            }
        } else if (!isPublished && article.status === 'unpublished') { // check if the article is not published and its status is unpublished for edge cases
             draftContainer.appendChild(createArticleCard(article));
        }
    });
}

function createArticleCard(article) {
    const a = document.createElement('a');
    a.href = `/WritersHub/edit/${article._id}`;
    a.className = 'hub-article-card';
    
    const date = new Date(article.updatedAt || article.createdAt).toLocaleString(); // converts the date to a readable format.
    const views = article.views || 0;
    const category = article.category || 'Uncategorized';
    const imgUrl = article.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=600&q=80';

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
