// Client-side logic for the editor dashboard

document.addEventListener("DOMContentLoaded", () => {
    const statusFilter = document.getElementById("status-filter");

    loadArticles(statusFilter.value);

    statusFilter.addEventListener("change", () => {
        loadArticles(statusFilter.value);
    });
});

// Fetches articles according to the status selected by the editor
async function loadArticles(filter) {
    const container = document.getElementById("articles-container");

    container.innerHTML = "<p>Loading articles...</p>";

    let url = "/api/articles";

    if (filter === "pending") {
        url += "?draft.status=pending";
    } else if (filter === "returned") {
        url += "?draft.status=returned";
    } else if (filter === "published") {
        url += "?status=published";
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to fetch articles");
        }

        const result = await response.json();

        renderArticles(result.data);

    } catch (error) {
        console.error("Error loading articles:", error);

        container.innerHTML =
            "<p>Could not load articles.</p>";
    }
}

// Displays the articles inside the editor dashboard
function renderArticles(articles) {
    const container = document.getElementById("articles-container");

    if (!articles || articles.length === 0) {
        container.innerHTML = "<p>No articles found.</p>";
        return;
    }

    container.innerHTML = "";

    articles.forEach((article) => {
        const articleCard = document.createElement("article");
        articleCard.classList.add("editor-article-card");

        const title =
            article.draft?.title || article.title || "Untitled article";

        const draftStatus =
            article.draft?.status || "No active draft";

        articleCard.innerHTML = `
            <h3>${title}</h3>
            <p><strong>Publication status:</strong> ${article.status}</p>
            <p><strong>Draft status:</strong> ${draftStatus}</p>
            <p><strong>Category:</strong> ${article.draft?.category || article.category || "No category"}</p>

            <button
                type="button"
                class="view-article-button"
                data-article-id="${article._id}">
                View article
            </button>
        `;

        container.appendChild(articleCard);
    });
    const viewButtons = document.querySelectorAll(".view-article-button");

    viewButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const articleId = button.dataset.articleId;
            loadArticleForEditor(articleId);
        });
    });
}
// Fetches a single article for editor review without counting a public view
async function loadArticleForEditor(articleId) {
    const container = document.getElementById("analytics-container");

    container.innerHTML = "<p>Loading article...</p>";

    try {
        const response = await fetch(
            `/api/articles/editor/${articleId}`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch article");
        }

        const article = await response.json();

        renderArticleDetails(article);

    } catch (error) {
        console.error("Error loading article:", error);

        container.innerHTML =
            "<p>Could not load article.</p>";
    }
}
// Displays the selected article for editor review
function renderArticleDetails(article) {
    const container = document.getElementById("analytics-container");

    const title =
        article.draft?.title || article.title || "Untitled article";

    const summary =
        article.draft?.summary || article.summary || "No summary";

    const content =
        article.draft?.content || article.content || "No content";

    const category =
        article.draft?.category || article.category || "No category";

    container.innerHTML = `
        <div class="editor-article-details">
            <h3>${title}</h3>

            <p>
                <strong>Category:</strong>
                ${category}
            </p>

            <p>
                <strong>Publication status:</strong>
                ${article.status}
            </p>

            <p>
                <strong>Draft status:</strong>
                ${article.draft?.status || "No active draft"}
            </p>

            <h4>Summary</h4>
            <p>${summary}</p>

            <h4>Content</h4>
            <p>${content}</p>
            <div class="editor-actions">
    <h4>Editor Actions</h4>

    <label for="editor-note">Note for reporter:</label>

    <textarea
        id="editor-note"
        rows="4"
        placeholder="Explain what needs to be corrected..."></textarea>

    <button
    type="button"
    id="approve-article-button">
    Approve and publish
    </button>

    <button
        type="button"
        id="return-article-button">
        Return for corrections
    </button>

    <button
        type="button"
        id="delete-article-button">
      Delete article
    </button>
</div>
        </div>
    `;
    const approveButton = document.getElementById("approve-article-button");

    approveButton.addEventListener("click", () => {
        approveArticle(article._id);
    });
    const returnButton = document.getElementById("return-article-button");

    returnButton.addEventListener("click", () => {
        returnArticleForCorrections(article._id);
    });
    const deleteButton = document.getElementById("delete-article-button");

    deleteButton.addEventListener("click", () => {
        deleteArticle(article._id);
    });
}
// Returns an article to the reporter with an editor note
async function returnArticleForCorrections(articleId) {
    const noteInput = document.getElementById("editor-note");
    const editorNote = noteInput.value.trim();

    if (!editorNote) {
        alert("Please enter a note explaining what needs to be corrected.");
        return;
    }

    try {
        const response = await fetch(`/api/articles/${articleId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                draftStatus: "returned",
                editorNote: editorNote
            })
        });

        if (!response.ok) {
            throw new Error("Failed to return article");
        }

        alert("Article returned for corrections.");

        const statusFilter = document.getElementById("status-filter");
        loadArticles(statusFilter.value);

    } catch (error) {
        console.error("Error returning article:", error);
        alert("Could not return article for corrections.");
    }
}
// Deletes an article after editor confirmation
async function deleteArticle(articleId) {
    const confirmed = confirm(
        "Are you sure you want to delete this article?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/articles/${articleId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Failed to delete article");
        }

        alert("Article deleted successfully.");

        const statusFilter = document.getElementById("status-filter");
        loadArticles(statusFilter.value);

        const analyticsContainer =
            document.getElementById("analytics-container");

        analyticsContainer.innerHTML =
            "<p>Select an article to view its analytics.</p>";

    } catch (error) {
        console.error("Error deleting article:", error);
        alert("Could not delete article.");
    }
}
// Approves and publishes an article.
// The editor identity will be supplied by server-side authentication.
async function approveArticle(articleId) {
    try {
        const response = await fetch(`/api/articles/${articleId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                status: "published"
            })
        });

        if (!response.ok) {
            throw new Error("Failed to approve article");
        }

        alert("Article approved and published.");

        const statusFilter = document.getElementById("status-filter");
        loadArticles(statusFilter.value);

    } catch (error) {
        console.error("Error approving article:", error);
        alert("Could not approve article.");
    }
}