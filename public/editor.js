// Client-side logic for the Editor Dashboard

let viewsChart = null;
let selectedArticleId = null;


// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
    const statusFilter = document.getElementById("status-filter");
    const categoryFilter = document.getElementById("category-filter");

    if (!statusFilter || !categoryFilter) {
        console.error("Editor filters could not be found.");
        return;
    }

    await loadCategories();
    await loadArticles();

    statusFilter.addEventListener("change", () => {
        loadArticles();
    });

    categoryFilter.addEventListener("change", () => {
        loadArticles();
    });
});


// =========================================================
// ARTICLE LIST
// =========================================================

async function loadCategories() {
    const categoryFilter = document.getElementById("category-filter");

    try {
        const response = await fetch("/api/articles/categories");

        if (!response.ok) {
            throw new Error("Failed to fetch categories");
        }

        const categories = await response.json();

        const currentValue = categoryFilter.value;

        categoryFilter.textContent = "";

        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "All categories";
        categoryFilter.appendChild(allOption);

        if (Array.isArray(categories)) {
            categories
                .filter(Boolean)
                .sort((a, b) =>
                    String(a).localeCompare(String(b))
                )
                .forEach((category) => {
                    const option = document.createElement("option");

                    option.value = category;
                    option.textContent = category;

                    categoryFilter.appendChild(option);
                });
        }

        if (
            [...categoryFilter.options].some(
                (option) => option.value === currentValue
            )
        ) {
            categoryFilter.value = currentValue;
        }

    } catch (error) {
        console.error("Error loading categories:", error);
    }
}


async function loadArticles() {
    const container = document.getElementById("articles-container");
    const statusFilter = document.getElementById("status-filter");
    const categoryFilter = document.getElementById("category-filter");

    container.textContent = "";

    const loading = document.createElement("p");
    loading.className = "loading-state";
    loading.textContent = "Loading articles...";
    container.appendChild(loading);

    const params = new URLSearchParams();

    const status = statusFilter?.value || "all";
    const category = categoryFilter?.value || "all";

    /*
     * Publication status and draft workflow status are stored
     * separately in the current Article model.
     */
    if (status === "published") {
        params.set("status", "published");
    } else if (
        status === "pending" ||
        status === "rejected" ||
        status === "draft"
    ) {
        params.set("draft.status", status);
    }

    if (category !== "all") {
        params.set("category", category);
    }

    // Editor dashboard should be able to see a useful working set.
    params.set("limit", "100");

    const queryString = params.toString();
    const url = queryString
        ? `/api/articles?${queryString}`
        : "/api/articles";

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to fetch articles");
        }

        const result = await response.json();

        const articles = Array.isArray(result)
            ? result
            : result.data || [];

        renderArticles(articles);

    } catch (error) {
        console.error("Error loading articles:", error);

        container.textContent = "";

        const message = document.createElement("p");
        message.className = "editor-message editor-message-error";
        message.textContent = "Could not load articles.";

        container.appendChild(message);
    }
}


function renderArticles(articles) {
    const container = document.getElementById("articles-container");

    container.textContent = "";

    if (!Array.isArray(articles) || articles.length === 0) {
        const message = document.createElement("p");

        message.className = "loading-state";
        message.textContent = "No articles found.";

        container.appendChild(message);
        return;
    }

    articles.forEach((article) => {
        const card = document.createElement("article");
        card.className = "editor-article-card";

        const title =
            article.draft?.title ||
            article.title ||
            "Untitled article";

        const category =
            article.draft?.category ||
            article.category ||
            "No category";

        const workflowStatus =
            article.draft?.status ||
            article.status ||
            "unknown";

        const heading = document.createElement("h3");
        heading.textContent = title;

        const meta = document.createElement("div");
        meta.className = "editor-card-meta";

        const badge = document.createElement("span");

        badge.className =
            `editor-status-badge ${getStatusClass(workflowStatus)}`;

        badge.textContent =
            getStatusLabel(workflowStatus);

        const categoryText = document.createElement("span");
        categoryText.textContent = category;

        meta.appendChild(badge);
        meta.appendChild(categoryText);

        const publicationStatus =
            createLabelledParagraph(
                "Publication status: ",
                article.status || "Unknown"
            );

        const draftStatus =
            createLabelledParagraph(
                "Draft status: ",
                article.draft?.status || "No active draft"
            );

        const viewButton = document.createElement("button");

        viewButton.type = "button";
        viewButton.className =
            "editor-btn editor-btn-primary";

        viewButton.textContent = "Review article";

        viewButton.addEventListener("click", async () => {
            selectedArticleId = article._id;

            await loadArticleForEditor(article._id);
            await loadAnalytics(article._id);

            document
                .getElementById("review-section")
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
        });

        card.appendChild(heading);
        card.appendChild(meta);
        card.appendChild(publicationStatus);
        card.appendChild(draftStatus);
        card.appendChild(viewButton);

        container.appendChild(card);
    });
}


function getStatusClass(status) {
    const allowed = [
        "pending",
        "published",
        "rejected",
        "draft"
    ];

    return allowed.includes(status)
        ? status
        : "draft";
}


function getStatusLabel(status) {
    if (status === "pending") {
        return "Pending";
    }

    if (status === "rejected") {
        return "Returned for revision";
    }

    if (status === "published") {
        return "Published";
    }

    if (status === "draft") {
        return "Draft";
    }

    return status || "Unknown";
}


// =========================================================
// ARTICLE REVIEW
// =========================================================

async function loadArticleForEditor(articleId) {
    const container = document.getElementById("review-container");

    container.textContent = "";

    const loading = document.createElement("p");
    loading.className = "loading-state";
    loading.textContent = "Loading article...";

    container.appendChild(loading);

    try {
        /*
         * skipViews=true is important:
         * an Editor review must not count as a public article view.
         */
        const response = await fetch(
            `/api/articles/${articleId}?skipViews=true`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch article");
        }

        const article = await response.json();

        renderArticleDetails(article);

    } catch (error) {
        console.error("Error loading article:", error);

        container.textContent = "";

        const message = document.createElement("p");
        message.className = "editor-message editor-message-error";
        message.textContent = "Could not load article.";

        container.appendChild(message);
    }
}


function renderArticleDetails(article) {
    const container = document.getElementById("review-container");

    const hasDraft = Boolean(article.draft);

    const hasPendingDraft =
        article.draft?.status === "pending";

    const isPublished =
        article.status === "published";

    container.textContent = "";

    const details = document.createElement("div");
    details.className = "editor-article-details";

    const statusBlock = document.createElement("div");

    statusBlock.appendChild(
        createLabelledParagraph(
            "Publication status: ",
            article.status || "Unknown"
        )
    );

    statusBlock.appendChild(
        createLabelledParagraph(
            "Draft status: ",
            article.draft?.status || "No active draft"
        )
    );

    details.appendChild(statusBlock);

    /*
     * For a published article with a staged draft,
     * show the public and staged versions side by side.
     */
    if (isPublished && hasDraft) {
        const comparison = document.createElement("div");
        comparison.className = "version-comparison";

        comparison.appendChild(
            createPublishedVersion(article)
        );

        comparison.appendChild(
            createReviewVersion(article, hasPendingDraft)
        );

        details.appendChild(comparison);

    } else {
        const layout = document.createElement("div");
        layout.className = "review-layout";

        layout.appendChild(
            createReviewVersion(article, hasPendingDraft)
        );

        details.appendChild(layout);
    }

    details.appendChild(
        createEditorActions(article, hasPendingDraft)
    );

    container.appendChild(details);
}


function createPublishedVersion(article) {
    const section = document.createElement("section");

    section.className =
        "review-version published-version";

    const heading = document.createElement("h3");
    heading.textContent = "Currently Published Version";

    section.appendChild(heading);

    section.appendChild(
        createReadOnlyField(
            "Title",
            article.title || "Untitled article"
        )
    );

    section.appendChild(
        createReadOnlyField(
            "Category",
            article.category || "No category"
        )
    );

    section.appendChild(
        createReadOnlyField(
            "Summary",
            article.summary || "No summary"
        )
    );

    section.appendChild(
        createReadOnlyField(
            "Content",
            article.content || "No content",
            true
        )
    );

    return section;
}


function createReviewVersion(article, editable) {
    const section = document.createElement("section");

    section.className =
        "review-version staged-version";

    const heading = document.createElement("h3");

    if (article.status === "published" && article.draft) {
        heading.textContent = "Staged Updated Version";
    } else if (article.draft) {
        heading.textContent = "Submitted Version";
    } else {
        heading.textContent = "Article Content";
    }

    section.appendChild(heading);

    const title =
        article.draft?.title ??
        article.title ??
        "";

    const category =
        article.draft?.category ??
        article.category ??
        "";

    const summary =
        article.draft?.summary ??
        article.summary ??
        "";

    const content =
        article.draft?.content ??
        article.content ??
        "";

    section.appendChild(
        createEditableField(
            "Title",
            "edit-title",
            title,
            "input",
            editable
        )
    );

    section.appendChild(
        createEditableField(
            "Category",
            "edit-category",
            category,
            "input",
            editable
        )
    );

    section.appendChild(
        createEditableField(
            "Summary",
            "edit-summary",
            summary,
            "textarea",
            editable
        )
    );

    section.appendChild(
        createEditableField(
            "Content",
            "edit-content",
            content,
            "textarea",
            editable,
            true
        )
    );

    return section;
}


function createReadOnlyField(labelText, value, isContent = false) {
    const wrapper = document.createElement("div");
    wrapper.className = "review-field";

    const label = document.createElement("label");
    label.textContent = labelText;

    const valueElement = document.createElement("div");

    if (isContent) {
        valueElement.className = "review-content";
    }

    valueElement.textContent = value;

    wrapper.appendChild(label);
    wrapper.appendChild(valueElement);

    return wrapper;
}


function createEditableField(
    labelText,
    id,
    value,
    type,
    editable,
    large = false
) {
    const wrapper = document.createElement("div");
    wrapper.className = "review-field";

    const label = document.createElement("label");

    label.htmlFor = id;
    label.textContent = labelText;

    let field;

    if (type === "textarea") {
        field = document.createElement("textarea");

        field.rows = large ? 12 : 4;
    } else {
        field = document.createElement("input");
        field.type = "text";
    }

    field.id = id;
    field.value = value;
    field.disabled = !editable;

    wrapper.appendChild(label);
    wrapper.appendChild(field);

    return wrapper;
}


// =========================================================
// EDITOR ACTIONS
// =========================================================

function createEditorActions(article, hasPendingDraft) {
    const wrapper = document.createElement("div");

    const heading = document.createElement("h3");
    heading.textContent = "Editor Actions";

    wrapper.appendChild(heading);

    if (hasPendingDraft) {
        const actions = document.createElement("div");
        actions.className = "review-actions";

        const saveButton = createButton(
            "Save changes",
            "editor-btn editor-btn-secondary",
            () => saveArticleChanges(article._id)
        );

        const approveButton = createButton(
            "Approve & Publish",
            "editor-btn editor-btn-success",
            () => approveArticle(article._id)
        );

        actions.appendChild(saveButton);
        actions.appendChild(approveButton);

        wrapper.appendChild(actions);

        const revisionBox = document.createElement("div");
        revisionBox.className = "revision-comments";

        const noteLabel = document.createElement("label");

        noteLabel.htmlFor = "editor-note";
        noteLabel.textContent =
            "Required revision comments";

        const noteInput = document.createElement("textarea");

        noteInput.id = "editor-note";
        noteInput.placeholder =
            "Explain what the reporter needs to revise...";

        const rejectButton = createButton(
            "Return for revision",
            "editor-btn editor-btn-warning",
            () => returnArticleForCorrections(article._id)
        );

        revisionBox.appendChild(noteLabel);
        revisionBox.appendChild(noteInput);
        revisionBox.appendChild(rejectButton);

        wrapper.appendChild(revisionBox);

    } else {
        const message = document.createElement("p");

        message.className = "editor-message";
        message.textContent =
            "This article does not currently have a draft pending approval.";

        wrapper.appendChild(message);
    }

    const deleteActions = document.createElement("div");
    deleteActions.className = "review-actions";

    const deleteButton = createButton(
        "Delete article",
        "editor-btn editor-btn-danger",
        () => deleteArticle(article._id)
    );

    deleteActions.appendChild(deleteButton);
    wrapper.appendChild(deleteActions);

    return wrapper;
}


function createButton(text, className, handler) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.textContent = text;

    button.addEventListener("click", handler);

    return button;
}


// =========================================================
// SAVE PENDING ARTICLE
// =========================================================

async function saveArticleChanges(articleId) {
    const title =
        document.getElementById("edit-title")?.value.trim();

    const category =
        document.getElementById("edit-category")?.value.trim();

    const summary =
        document.getElementById("edit-summary")?.value.trim();

    const content =
        document.getElementById("edit-content")?.value.trim();

    if (!title || !category || !summary || !content) {
        alert(
            "Title, category, summary and content are required."
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
                    draftStatus: "pending",
                    title,
                    category,
                    summary,
                    content
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                await getResponseError(
                    response,
                    "Failed to save article changes"
                )
            );
        }

        alert("Article changes saved.");

        await refreshSelectedArticle(articleId);

    } catch (error) {
        console.error(
            "Error saving article changes:",
            error
        );

        alert("Could not save article changes.");
    }
}


// =========================================================
// RETURN / REJECT ARTICLE
// =========================================================

async function returnArticleForCorrections(articleId) {
    const noteInput =
        document.getElementById("editor-note");

    const editorNote =
        noteInput?.value.trim() || "";

    /*
     * Front-end validation is useful for the user.
     * The backend must also enforce this rule.
     */
    if (!editorNote) {
        alert(
            "Revision comments are required before returning an article."
        );

        noteInput?.focus();
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
                    draftStatus: "rejected",
                    editorNote
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                await getResponseError(
                    response,
                    "Failed to return article"
                )
            );
        }

        alert("Article returned for revision.");

        await loadArticles();
        await loadArticleForEditor(articleId);

    } catch (error) {
        console.error(
            "Error returning article:",
            error
        );

        alert(
            "Could not return article for revision."
        );
    }
}


// =========================================================
// APPROVE / PUBLISH
// =========================================================

async function approveArticle(articleId) {
    try {
        /*
         * The authenticated Editor identity must ultimately
         * come from server-side authentication.
         *
         * We intentionally do NOT send an arbitrary updaterId
         * from the browser.
         */
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
            throw new Error(
                await getResponseError(
                    response,
                    "Failed to approve article"
                )
            );
        }

        alert("Article approved and published.");

        await loadArticles();
        await loadArticleForEditor(articleId);
        await loadAnalytics(articleId);

    } catch (error) {
        console.error(
            "Error approving article:",
            error
        );

        alert(
            "Could not approve article. " +
            "Server-side Editor authentication may still need to be connected."
        );
    }
}


// =========================================================
// DELETE
// =========================================================

async function deleteArticle(articleId) {
    const confirmed = confirm(
        "Are you sure you want to permanently delete this article?"
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
            throw new Error(
                await getResponseError(
                    response,
                    "Failed to delete article"
                )
            );
        }

        alert("Article deleted successfully.");

        selectedArticleId = null;

        await loadArticles();
        resetSelectedArticle();

    } catch (error) {
        console.error(
            "Error deleting article:",
            error
        );

        alert("Could not delete article.");
    }
}


async function refreshSelectedArticle(articleId) {
    await loadArticles();
    await loadArticleForEditor(articleId);
    await loadAnalytics(articleId);
}


// =========================================================
// ANALYTICS
// =========================================================

async function loadAnalytics(articleId) {
    const message =
        document.getElementById("analytics-message");

    const chartContainer =
        document.getElementById("chart-container");

    if (!message || !chartContainer) {
        return;
    }

    message.textContent = "Loading analytics...";
    chartContainer.hidden = true;

    try {
        const response = await fetch(
            `/api/statistics/article/${articleId}`
        );

        if (!response.ok) {
            throw new Error(
                "Failed to fetch analytics"
            );
        }

        const analytics = await response.json();

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


function renderAnalytics(analytics) {
    const message =
        document.getElementById("analytics-message");

    const chartContainer =
        document.getElementById("chart-container");

    const canvas =
        document.getElementById("views-chart");

    const comparisonContainer =
        document.getElementById("update-comparison");

    if (
        !message ||
        !chartContainer ||
        !canvas ||
        !comparisonContainer
    ) {
        return;
    }

    const views = Array.isArray(analytics.views)
        ? analytics.views
        : [];

    const updates = Array.isArray(analytics.updates)
        ? analytics.updates
        : [];

    if (views.length === 0) {
        message.textContent =
            "No view statistics are available for this article yet.";

        chartContainer.hidden = true;
        comparisonContainer.textContent = "";

        if (viewsChart) {
            viewsChart.destroy();
            viewsChart = null;
        }

        return;
    }

    message.textContent = "";
    chartContainer.hidden = false;

    /*
     * Use a linear timestamp scale instead of string labels.
     * This allows update markers to remain at their exact
     * publication timestamp rather than snapping them to
     * the nearest hourly statistics bucket.
     */
    const viewPoints = views
        .map((item) => ({
            x: new Date(item.timestamp).getTime(),
            y: Number(item.views) || 0
        }))
        .filter(
            (point) =>
                Number.isFinite(point.x) &&
                Number.isFinite(point.y)
        )
        .sort((a, b) => a.x - b.x);

    const updateMarkers =
        createUpdateMarkers(views, updates);

    if (viewsChart) {
        viewsChart.destroy();
    }

    viewsChart = new Chart(canvas, {
        type: "line",

        data: {
            datasets: [
                {
                    label: "Views",
                    data: viewPoints,
                    parsing: false,
                    tension: 0.2
                },
                {
                    label: "Published update",
                    data: updateMarkers,
                    parsing: false,
                    type: "scatter",
                    pointStyle: "triangle",
                    pointRadius: 8,
                    pointHoverRadius: 10
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

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
                        title(context) {
                            if (!context.length) {
                                return "";
                            }

                            const timestamp =
                                context[0].parsed.x;

                            return new Date(
                                timestamp
                            ).toLocaleString();
                        },

                        label(context) {
                            if (
                                context.dataset.label ===
                                "Published update"
                            ) {
                                const marker = context.raw;

                                return [
                                    marker.updateText,
                                    `Published: ${new Date(
                                        marker.exactTimestamp
                                    ).toLocaleString()
                                    }`
                                ];
                            }

                            return `Views: ${context.parsed.y}`;
                        }
                    }
                }
            },

            scales: {
                x: {
                    type: "linear",

                    title: {
                        display: true,
                        text: "Time"
                    },

                    ticks: {
                        callback(value) {
                            return formatChartTime(value);
                        }
                    }
                },

                y: {
                    beginAtZero: true,

                    title: {
                        display: true,
                        text: "Views per time bucket"
                    }
                }
            }
        }
    });

    renderUpdateComparisons(
        views,
        updates,
        comparisonContainer
    );
}


/*
 * Each marker uses the exact update timestamp for its x value.
 *
 * The y value is estimated from the surrounding aggregated
 * view buckets only so the marker can be placed visually on
 * the chart. Its x coordinate is never moved.
 */
function createUpdateMarkers(views, updates) {
    return updates
        .map((update) => {
            const updateTime =
                new Date(update.updatedAt).getTime();

            if (!Number.isFinite(updateTime)) {
                return null;
            }

            return {
                x: updateTime,
                y: estimateViewsAtTime(
                    views,
                    updateTime
                ),

                exactTimestamp: update.updatedAt,

                updateText:
                    update.edits ||
                    "Article published."
            };
        })
        .filter(Boolean);
}


function estimateViewsAtTime(views, timestamp) {
    if (!views.length) {
        return 0;
    }

    const points = views
        .map((view) => ({
            time: new Date(view.timestamp).getTime(),
            views: Number(view.views) || 0
        }))
        .filter((point) =>
            Number.isFinite(point.time)
        )
        .sort((a, b) => a.time - b.time);

    if (!points.length) {
        return 0;
    }

    if (timestamp <= points[0].time) {
        return points[0].views;
    }

    if (timestamp >= points[points.length - 1].time) {
        return points[points.length - 1].views;
    }

    for (let index = 0; index < points.length - 1; index++) {
        const before = points[index];
        const after = points[index + 1];

        if (
            timestamp >= before.time &&
            timestamp <= after.time
        ) {
            const distance =
                after.time - before.time;

            if (distance === 0) {
                return before.views;
            }

            const ratio =
                (timestamp - before.time) /
                distance;

            return (
                before.views +
                (after.views - before.views) *
                ratio
            );
        }
    }

    return 0;
}


function formatChartTime(timestamp) {
    const date = new Date(Number(timestamp));

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


// =========================================================
// BEFORE / AFTER UPDATE COMPARISON
// =========================================================

function renderUpdateComparisons(
    views,
    updates,
    container
) {
    container.textContent = "";

    if (updates.length === 0) {
        const message = document.createElement("p");

        message.textContent =
            "No published updates are recorded for this article yet.";

        container.appendChild(message);
        return;
    }

    updates.forEach((update) => {
        const comparison =
            calculateViewsAroundUpdate(
                views,
                update.updatedAt
            );

        const card = document.createElement("article");
        card.className = "comparison-card";

        const updateDate =
            new Date(
                update.updatedAt
            ).toLocaleString();

        const heading = document.createElement("h4");
        heading.textContent =
            `Published update — ${updateDate}`;

        const updateText =
            createLabelledParagraph(
                "Update: ",
                update.edits ||
                "Article published."
            );

        const before =
            createLabelledParagraph(
                "Views in previous 24 hours: ",
                comparison.before
            );

        const after =
            createLabelledParagraph(
                "Views in following 24 hours: ",
                comparison.after
            );

        const difference =
            comparison.after -
            comparison.before;

        const differenceText =
            difference > 0
                ? `+${difference}`
                : String(difference);

        const differenceElement =
            createLabelledParagraph(
                "Before/after difference: ",
                differenceText
            );

        /*
         * This is a descriptive comparison.
         * It does not claim that the editorial update
         * caused the change in views.
         */
        const explanation =
            document.createElement("p");

        explanation.textContent =
            "Comparison of engagement before and after the published update.";

        card.appendChild(heading);
        card.appendChild(updateText);
        card.appendChild(before);
        card.appendChild(after);
        card.appendChild(differenceElement);
        card.appendChild(explanation);

        container.appendChild(card);
    });
}


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

        const count =
            Number(view.views) || 0;

        if (
            viewTime >=
            updateTime - twentyFourHours &&
            viewTime < updateTime
        ) {
            before += count;
        }

        if (
            viewTime >= updateTime &&
            viewTime <
            updateTime + twentyFourHours
        ) {
            after += count;
        }
    });

    return {
        before,
        after
    };
}


// =========================================================
// HELPERS
// =========================================================

function createLabelledParagraph(label, value) {
    const paragraph =
        document.createElement("p");

    const strong =
        document.createElement("strong");

    strong.textContent = label;

    paragraph.appendChild(strong);
    paragraph.append(
        String(value ?? "")
    );

    return paragraph;
}


async function getResponseError(
    response,
    fallbackMessage
) {
    try {
        const data = await response.json();

        return (
            data.message ||
            data.error ||
            fallbackMessage
        );

    } catch {
        return fallbackMessage;
    }
}


function resetSelectedArticle() {
    const reviewContainer =
        document.getElementById("review-container");

    const message =
        document.getElementById("analytics-message");

    const chartContainer =
        document.getElementById("chart-container");

    const comparisonContainer =
        document.getElementById("update-comparison");

    if (reviewContainer) {
        reviewContainer.textContent = "";

        const emptyState =
            document.createElement("div");

        emptyState.className = "empty-state";

        const heading =
            document.createElement("h3");

        heading.textContent =
            "No article selected";

        const text =
            document.createElement("p");

        text.textContent =
            "Select an article above to review it.";

        emptyState.appendChild(heading);
        emptyState.appendChild(text);

        reviewContainer.appendChild(emptyState);
    }

    if (message) {
        message.textContent =
            "Select an article to view its analytics.";
    }

    if (comparisonContainer) {
        comparisonContainer.textContent = "";
    }

    if (chartContainer) {
        chartContainer.hidden = true;
    }

    if (viewsChart) {
        viewsChart.destroy();
        viewsChart = null;
    }
}