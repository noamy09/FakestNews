// Client-side logic for the editor dashboard

let viewsChart = null;

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
            article.draft?.title ||
            article.title ||
            "Untitled article";

        const draftStatus =
            article.draft?.status ||
            "No active draft";

        const category =
            article.draft?.category ||
            article.category ||
            "No category";

        articleCard.innerHTML = `
            <h3>${title}</h3>

            <p>
                <strong>Publication status:</strong>
                ${article.status}
            </p>

            <p>
                <strong>Draft status:</strong>
                ${draftStatus}
            </p>

            <p>
                <strong>Category:</strong>
                ${category}
            </p>

            <button
                type="button"
                class="view-article-button"
                data-article-id="${article._id}">
                View article
            </button>
        `;

        container.appendChild(articleCard);
    });

    const viewButtons =
        document.querySelectorAll(".view-article-button");

    viewButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const articleId = button.dataset.articleId;

            loadArticleForEditor(articleId);
            loadAnalytics(articleId);
        });
    });
}


// Fetches a single article for editor review
// without counting a public view
async function loadArticleForEditor(articleId) {
    const container =
        document.getElementById("review-container");

    container.innerHTML =
        "<p>Loading article...</p>";

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
    const container =
        document.getElementById("review-container");

    const title =
        article.draft?.title ||
        article.title ||
        "Untitled article";

    const summary =
        article.draft?.summary ||
        article.summary ||
        "No summary";

    const content =
        article.draft?.content ||
        article.content ||
        "No content";

    const category =
        article.draft?.category ||
        article.category ||
        "No category";

    const draftStatus =
        article.draft?.status ||
        "No active draft";

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
                ${draftStatus}
            </p>

            <h4>Summary</h4>
            <p>${summary}</p>

            <h4>Content</h4>
            <p>${content}</p>

            <div class="editor-actions">
                <h4>Editor Actions</h4>

                <label for="editor-note">
                    Note for reporter:
                </label>

                <textarea
                    id="editor-note"
                    rows="4"
                    placeholder="Explain what needs to be corrected...">
                </textarea>

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

    const approveButton =
        document.getElementById("approve-article-button");

    approveButton.addEventListener("click", () => {
        approveArticle(article._id);
    });

    const returnButton =
        document.getElementById("return-article-button");

    returnButton.addEventListener("click", () => {
        returnArticleForCorrections(article._id);
    });

    const deleteButton =
        document.getElementById("delete-article-button");

    deleteButton.addEventListener("click", () => {
        deleteArticle(article._id);
    });
}


// Returns an article to the reporter with an editor note
async function returnArticleForCorrections(articleId) {
    const noteInput =
        document.getElementById("editor-note");

    const editorNote =
        noteInput.value.trim();

    if (!editorNote) {
        alert(
            "Please enter a note explaining what needs to be corrected."
        );

        return;
    }

    try {
        const response = await fetch(
            `/api/articles/${articleId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    draftStatus: "returned",
                    editorNote: editorNote
                })
            }
        );

        if (!response.ok) {
            throw new Error("Failed to return article");
        }

        alert("Article returned for corrections.");

        const statusFilter =
            document.getElementById("status-filter");

        loadArticles(statusFilter.value);

    } catch (error) {
        console.error(
            "Error returning article:",
            error
        );

        alert(
            "Could not return article for corrections."
        );
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
        const response = await fetch(
            `/api/articles/${articleId}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error("Failed to delete article");
        }

        alert("Article deleted successfully.");

        const statusFilter =
            document.getElementById("status-filter");

        loadArticles(statusFilter.value);

        resetSelectedArticle();

    } catch (error) {
        console.error(
            "Error deleting article:",
            error
        );

        alert("Could not delete article.");
    }
}


// Approves and publishes an article.
// The editor identity will be supplied
// by server-side authentication.
async function approveArticle(articleId) {
    try {
        const response = await fetch(
            `/api/articles/${articleId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    status: "published"
                })
            }
        );

        if (!response.ok) {
            throw new Error("Failed to approve article");
        }

        alert("Article approved and published.");

        const statusFilter =
            document.getElementById("status-filter");

        loadArticles(statusFilter.value);

    } catch (error) {
        console.error(
            "Error approving article:",
            error
        );

        alert("Could not approve article.");
    }
}


// Fetches analytics data for the selected article
async function loadAnalytics(articleId) {
    const message =
        document.getElementById("analytics-message");

    const chartContainer =
        document.getElementById("chart-container");

    message.textContent =
        "Loading analytics...";

    chartContainer.hidden = true;

    try {
        const response = await fetch(
            `/api/statistics/article/${articleId}`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch analytics");
        }

        const analytics =
            await response.json();

        renderAnalytics(analytics);

    } catch (error) {
        console.error(
            "Error loading analytics:",
            error
        );

        message.textContent =
            "Could not load article analytics.";

        chartContainer.hidden = true;
    }
}


// Displays the article view statistics as a line chart
// together with markers for published updates
function renderAnalytics(analytics) {
    const message =
        document.getElementById("analytics-message");

    const chartContainer =
        document.getElementById("chart-container");

    const canvas =
        document.getElementById("views-chart");

    const comparisonContainer =
        document.getElementById("update-comparison");

    const views =
        analytics.views || [];

    const updates =
        analytics.updates || [];

    if (views.length === 0) {
        message.textContent =
            "No view statistics are available for this article yet.";

        chartContainer.hidden = true;

        comparisonContainer.innerHTML = "";

        if (viewsChart) {
            viewsChart.destroy();
            viewsChart = null;
        }

        return;
    }

    message.textContent = "";
    chartContainer.hidden = false;

    const labels = views.map((item) => {
        const date =
            new Date(item.timestamp);

        return date.toLocaleString();
    });

    const viewCounts = views.map((item) => {
        return item.views;
    });

    const updateMarkers =
        createUpdateMarkers(views, updates);

    if (viewsChart) {
        viewsChart.destroy();
    }

    viewsChart = new Chart(
        canvas,
        {
            type: "line",

            data: {
                labels: labels,

                datasets: [
                    {
                        label: "Views",
                        data: viewCounts,
                        tension: 0.2
                    },
                    {
                        label: "Published update",
                        data: updateMarkers,
                        type: "scatter",
                        pointStyle: "triangle",
                        pointRadius: 8,
                        pointHoverRadius: 10
                    }
                ]
            },

            options: {
                responsive: true,

                interaction: {
                    mode: "nearest",
                    intersect: false
                },

                plugins: {
                    title: {
                        display: true,
                        text: "Article Views Over Time"
                    },

                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                if (
                                    context.dataset.label ===
                                    "Published update"
                                ) {
                                    const marker =
                                        context.raw;

                                    return marker.updateText;
                                }

                                return `Views: ${context.raw}`;
                            }
                        }
                    }
                },

                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Time"
                        }
                    },

                    y: {
                        beginAtZero: true,

                        title: {
                            display: true,
                            text: "Views"
                        }
                    }
                }
            }
        }
    );

    renderUpdateComparisons(
        views,
        updates,
        comparisonContainer
    );
}


// Creates a marker for each published update
// at the closest available statistics point
function createUpdateMarkers(views, updates) {
    return updates.map((update) => {
        const updateTime =
            new Date(update.updatedAt).getTime();

        let closestIndex = 0;
        let smallestDifference = Infinity;

        views.forEach((view, index) => {
            const viewTime =
                new Date(view.timestamp).getTime();

            const difference =
                Math.abs(viewTime - updateTime);

            if (difference < smallestDifference) {
                smallestDifference = difference;
                closestIndex = index;
            }
        });

        const closestDate =
            new Date(
                views[closestIndex].timestamp
            ).toLocaleString();

        return {
            x: closestDate,
            y: views[closestIndex].views,
            updateText:
                update.edits || "Article published."
        };
    });
}


// Displays a before-and-after comparison
// for every published article update
function renderUpdateComparisons(
    views,
    updates,
    container
) {
    container.innerHTML = "";

    if (updates.length === 0) {
        container.innerHTML =
            "<p>No published updates are recorded for this article yet.</p>";

        return;
    }

    const comparisonHeading =
        document.createElement("h3");

    comparisonHeading.textContent =
        "Views Before and After Updates";

    container.appendChild(comparisonHeading);

    updates.forEach((update) => {
        const comparison =
            calculateViewsAroundUpdate(
                views,
                update.updatedAt
            );

        const updateElement =
            document.createElement("div");

        updateElement.classList.add(
            "update-comparison-item"
        );

        const updateDate =
            new Date(update.updatedAt)
                .toLocaleString();

        const difference =
            comparison.after -
            comparison.before;

        let differenceText =
            difference.toString();

        if (difference > 0) {
            differenceText =
                `+${difference}`;
        }

        updateElement.innerHTML = `
            <h4>
                Update: ${updateDate}
            </h4>

            <p>
                <strong>Update:</strong>
                ${update.edits || "Article published."}
            </p>

            <p>
                <strong>Views in the 24 hours before:</strong>
                ${comparison.before}
            </p>

            <p>
                <strong>Views in the 24 hours after:</strong>
                ${comparison.after}
            </p>

            <p>
                <strong>Difference:</strong>
                ${differenceText}
            </p>
        `;

        container.appendChild(updateElement);
    });
}


// Calculates total views during the 24 hours
// before and after a published update
function calculateViewsAroundUpdate(
    views,
    updateTimestamp
) {
    const updateTime =
        new Date(updateTimestamp).getTime();

    const twentyFourHours =
        24 * 60 * 60 * 1000;

    let before = 0;
    let after = 0;

    views.forEach((view) => {
        const viewTime =
            new Date(view.timestamp).getTime();

        if (
            viewTime >= updateTime - twentyFourHours &&
            viewTime < updateTime
        ) {
            before += view.views;
        }

        if (
            viewTime >= updateTime &&
            viewTime <= updateTime + twentyFourHours
        ) {
            after += view.views;
        }
    });

    return {
        before: before,
        after: after
    };
}


// Clears the review and analytics
// after an article is deleted
function resetSelectedArticle() {
    const reviewContainer =
        document.getElementById("review-container");

    const message =
        document.getElementById("analytics-message");

    const chartContainer =
        document.getElementById("chart-container");

    const comparisonContainer =
        document.getElementById("update-comparison");

    reviewContainer.innerHTML =
        "<p>Select an article to review it.</p>";

    message.textContent =
        "Select an article to view its analytics.";

    comparisonContainer.innerHTML = "";

    chartContainer.hidden = true;

    if (viewsChart) {
        viewsChart.destroy();
        viewsChart = null;
    }
}
// TEMPORARY TEST DATA - remove before commit
document.addEventListener("DOMContentLoaded", () => {
    renderAnalytics({
        views: [
            {
                timestamp: "2026-09-27T08:00:00",
                views: 10
            },
            {
                timestamp: "2026-09-27T12:00:00",
                views: 18
            },
            {
                timestamp: "2026-09-27T16:00:00",
                views: 25
            },
            {
                timestamp: "2026-09-27T20:00:00",
                views: 32
            },
            {
                timestamp: "2026-09-28T00:00:00",
                views: 40
            },
            {
                timestamp: "2026-09-28T04:00:00",
                views: 55
            },
            {
                timestamp: "2026-09-28T08:00:00",
                views: 70
            },
            {
                timestamp: "2026-09-28T12:00:00",
                views: 90
            }
        ],

        updates: [
            {
                updatedAt: "2026-09-27T18:00:00",
                edits: "Article published."
            }
        ]
    });
});