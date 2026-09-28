// Client-side logic for the editor dashboard

let viewsChart = null;

document.addEventListener("DOMContentLoaded", () => {
    const statusFilter =
        document.getElementById("status-filter");

    loadArticles(statusFilter.value);

    statusFilter.addEventListener("change", () => {
        loadArticles(statusFilter.value);
    });
});


// Fetches articles according to the status selected by the editor
async function loadArticles(filter) {
    const container =
        document.getElementById("articles-container");

    container.innerHTML =
        "<p>Loading articles...</p>";

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
            throw new Error(
                "Failed to fetch articles"
            );
        }

        const result =
            await response.json();

        renderArticles(result.data);

    } catch (error) {
        console.error(
            "Error loading articles:",
            error
        );

        container.innerHTML =
            "<p>Could not load articles.</p>";
    }
}


// Displays the articles inside the editor dashboard
function renderArticles(articles) {
    const container =
        document.getElementById(
            "articles-container"
        );

    if (
        !articles ||
        articles.length === 0
    ) {
        container.textContent = "";

        const message =
            document.createElement("p");

        message.textContent =
            "No articles found.";

        container.appendChild(message);

        return;
    }

    container.textContent = "";

    articles.forEach((article) => {
        const articleCard =
            document.createElement("article");

        articleCard.classList.add(
            "editor-article-card"
        );

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

        const titleElement =
            document.createElement("h3");

        titleElement.textContent =
            title;

        const publicationStatus =
            document.createElement("p");

        const publicationLabel =
            document.createElement("strong");

        publicationLabel.textContent =
            "Publication status: ";

        publicationStatus.appendChild(
            publicationLabel
        );

        publicationStatus.append(
            article.status || "Unknown"
        );

        const draftStatusElement =
            document.createElement("p");

        const draftLabel =
            document.createElement("strong");

        draftLabel.textContent =
            "Draft status: ";

        draftStatusElement.appendChild(
            draftLabel
        );

        draftStatusElement.append(
            draftStatus
        );

        const categoryElement =
            document.createElement("p");

        const categoryLabel =
            document.createElement("strong");

        categoryLabel.textContent =
            "Category: ";

        categoryElement.appendChild(
            categoryLabel
        );

        categoryElement.append(
            category
        );

        const viewButton =
            document.createElement("button");

        viewButton.type = "button";

        viewButton.classList.add(
            "view-article-button"
        );

        viewButton.textContent =
            "View article";

        viewButton.addEventListener(
            "click",
            () => {
                loadArticleForEditor(
                    article._id
                );

                loadAnalytics(
                    article._id
                );
            }
        );

        articleCard.appendChild(
            titleElement
        );

        articleCard.appendChild(
            publicationStatus
        );

        articleCard.appendChild(
            draftStatusElement
        );

        articleCard.appendChild(
            categoryElement
        );

        articleCard.appendChild(
            viewButton
        );

        container.appendChild(
            articleCard
        );
    });
}


// Fetches a single article for editor review
// without counting a public view
async function loadArticleForEditor(
    articleId
) {
    const container =
        document.getElementById(
            "review-container"
        );

    container.innerHTML =
        "<p>Loading article...</p>";

    try {
        const response = await fetch(
            `/api/articles/editor/${articleId}`
        );

        if (!response.ok) {
            throw new Error(
                "Failed to fetch article"
            );
        }

        const article =
            await response.json();

        renderArticleDetails(article);

    } catch (error) {
        console.error(
            "Error loading article:",
            error
        );

        container.innerHTML =
            "<p>Could not load article.</p>";
    }
}


// Displays the selected article for editor review
function renderArticleDetails(article) {
    const container =
        document.getElementById(
            "review-container"
        );

    const title =
        article.draft?.title ||
        article.title ||
        "";

    const summary =
        article.draft?.summary ||
        article.summary ||
        "";

    const content =
        article.draft?.content ||
        article.content ||
        "";

    const category =
        article.draft?.category ||
        article.category ||
        "";

    const draftStatus =
        article.draft?.status ||
        "No active draft";

    const hasPendingDraft =
        article.draft?.status ===
        "pending";

    container.textContent = "";

    const details =
        document.createElement("div");

    details.classList.add(
        "editor-article-details"
    );

    const heading =
        document.createElement("h3");

    heading.textContent =
        "Article Details";

    details.appendChild(heading);

    const publicationStatus =
        document.createElement("p");

    const publicationLabel =
        document.createElement("strong");

    publicationLabel.textContent =
        "Publication status: ";

    publicationStatus.appendChild(
        publicationLabel
    );

    publicationStatus.append(
        article.status || "Unknown"
    );

    details.appendChild(
        publicationStatus
    );

    const draftStatusElement =
        document.createElement("p");

    const draftStatusLabel =
        document.createElement("strong");

    draftStatusLabel.textContent =
        "Draft status: ";

    draftStatusElement.appendChild(
        draftStatusLabel
    );

    draftStatusElement.append(
        draftStatus
    );

    details.appendChild(
        draftStatusElement
    );

    const titleLabel =
        document.createElement("label");

    titleLabel.htmlFor =
        "edit-title";

    titleLabel.textContent =
        "Title:";

    const titleInput =
        document.createElement("input");

    titleInput.type = "text";
    titleInput.id = "edit-title";
    titleInput.value = title;
    titleInput.disabled =
        !hasPendingDraft;

    details.appendChild(
        titleLabel
    );

    details.appendChild(
        titleInput
    );

    const categoryLabel =
        document.createElement("label");

    categoryLabel.htmlFor =
        "edit-category";

    categoryLabel.textContent =
        "Category:";

    const categoryInput =
        document.createElement("input");

    categoryInput.type = "text";
    categoryInput.id =
        "edit-category";

    categoryInput.value =
        category;

    categoryInput.disabled =
        !hasPendingDraft;

    details.appendChild(
        categoryLabel
    );

    details.appendChild(
        categoryInput
    );

    const summaryLabel =
        document.createElement("label");

    summaryLabel.htmlFor =
        "edit-summary";

    summaryLabel.textContent =
        "Summary:";

    const summaryInput =
        document.createElement(
            "textarea"
        );

    summaryInput.id =
        "edit-summary";

    summaryInput.rows = 4;
    summaryInput.value = summary;

    summaryInput.disabled =
        !hasPendingDraft;

    details.appendChild(
        summaryLabel
    );

    details.appendChild(
        summaryInput
    );

    const contentLabel =
        document.createElement("label");

    contentLabel.htmlFor =
        "edit-content";

    contentLabel.textContent =
        "Content:";

    const contentInput =
        document.createElement(
            "textarea"
        );

    contentInput.id =
        "edit-content";

    contentInput.rows = 10;
    contentInput.value = content;

    contentInput.disabled =
        !hasPendingDraft;

    details.appendChild(
        contentLabel
    );

    details.appendChild(
        contentInput
    );

    const actions =
        document.createElement("div");

    actions.classList.add(
        "editor-actions"
    );

    const actionsHeading =
        document.createElement("h4");

    actionsHeading.textContent =
        "Editor Actions";

    actions.appendChild(
        actionsHeading
    );

    if (hasPendingDraft) {
        const saveButton =
            document.createElement(
                "button"
            );

        saveButton.type = "button";

        saveButton.id =
            "save-article-button";

        saveButton.textContent =
            "Save changes";

        saveButton.addEventListener(
            "click",
            () => {
                saveArticleChanges(
                    article._id
                );
            }
        );

        actions.appendChild(
            saveButton
        );

        const approveButton =
            document.createElement(
                "button"
            );

        approveButton.type =
            "button";

        approveButton.id =
            "approve-article-button";

        approveButton.textContent =
            "Approve and publish";

        approveButton.addEventListener(
            "click",
            () => {
                approveArticle(
                    article._id
                );
            }
        );

        actions.appendChild(
            approveButton
        );

        const noteLabel =
            document.createElement(
                "label"
            );

        noteLabel.htmlFor =
            "editor-note";

        noteLabel.textContent =
            "Note for reporter:";

        const noteInput =
            document.createElement(
                "textarea"
            );

        noteInput.id =
            "editor-note";

        noteInput.rows = 4;

        noteInput.placeholder =
            "Explain what needs to be corrected...";

        actions.appendChild(
            noteLabel
        );

        actions.appendChild(
            noteInput
        );

        const returnButton =
            document.createElement(
                "button"
            );

        returnButton.type =
            "button";

        returnButton.id =
            "return-article-button";

        returnButton.textContent =
            "Return for corrections";

        returnButton.addEventListener(
            "click",
            () => {
                returnArticleForCorrections(
                    article._id
                );
            }
        );

        actions.appendChild(
            returnButton
        );
    } else {
        const message =
            document.createElement("p");

        message.textContent =
            "This article does not currently have a draft pending approval.";

        actions.appendChild(
            message
        );
    }

    const deleteButton =
        document.createElement(
            "button"
        );

    deleteButton.type =
        "button";

    deleteButton.id =
        "delete-article-button";

    deleteButton.textContent =
        "Delete article";

    deleteButton.addEventListener(
        "click",
        () => {
            deleteArticle(
                article._id
            );
        }
    );

    actions.appendChild(
        deleteButton
    );

    details.appendChild(
        actions
    );

    container.appendChild(
        details
    );
}


// Saves changes made by the editor to a pending draft
async function saveArticleChanges(
    articleId
) {
    const title =
        document
            .getElementById(
                "edit-title"
            )
            .value
            .trim();

    const category =
        document
            .getElementById(
                "edit-category"
            )
            .value
            .trim();

    const summary =
        document
            .getElementById(
                "edit-summary"
            )
            .value
            .trim();

    const content =
        document
            .getElementById(
                "edit-content"
            )
            .value
            .trim();

    if (
        !title ||
        !summary ||
        !content
    ) {
        alert(
            "Title, summary and content are required."
        );

        return;
    }

    try {
        const response = await fetch(
            `/api/articles/${articleId}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    draftStatus:
                        "pending",
                    title: title,
                    category: category,
                    summary: summary,
                    content: content
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                "Failed to save article changes"
            );
        }

        alert(
            "Article changes saved."
        );

        loadArticleForEditor(
            articleId
        );

        const statusFilter =
            document.getElementById(
                "status-filter"
            );

        loadArticles(
            statusFilter.value
        );

    } catch (error) {
        console.error(
            "Error saving article changes:",
            error
        );

        alert(
            "Could not save article changes."
        );
    }
}


// Returns an article to the reporter with an editor note
async function returnArticleForCorrections(
    articleId
) {
    const noteInput =
        document.getElementById(
            "editor-note"
        );

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
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    draftStatus:
                        "returned",
                    editorNote:
                        editorNote
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                "Failed to return article"
            );
        }

        alert(
            "Article returned for corrections."
        );

        const statusFilter =
            document.getElementById(
                "status-filter"
            );

        loadArticles(
            statusFilter.value
        );

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
async function deleteArticle(
    articleId
) {
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
            throw new Error(
                "Failed to delete article"
            );
        }

        alert(
            "Article deleted successfully."
        );

        const statusFilter =
            document.getElementById(
                "status-filter"
            );

        loadArticles(
            statusFilter.value
        );

        resetSelectedArticle();

    } catch (error) {
        console.error(
            "Error deleting article:",
            error
        );

        alert(
            "Could not delete article."
        );
    }
}


// Approves and publishes an article.
// The editor identity will be supplied
// by server-side authentication.
async function approveArticle(
    articleId
) {
    try {
        const response = await fetch(
            `/api/articles/${articleId}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    status: "published"
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                "Failed to approve article"
            );
        }

        alert(
            "Article approved and published."
        );

        const statusFilter =
            document.getElementById(
                "status-filter"
            );

        loadArticles(
            statusFilter.value
        );

    } catch (error) {
        console.error(
            "Error approving article:",
            error
        );

        alert(
            "Could not approve article."
        );
    }
}


// Fetches analytics data for the selected article
async function loadAnalytics(
    articleId
) {
    const message =
        document.getElementById(
            "analytics-message"
        );

    const chartContainer =
        document.getElementById(
            "chart-container"
        );

    message.textContent =
        "Loading analytics...";

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

        const analytics =
            await response.json();

        renderAnalytics(
            analytics
        );

    } catch (error) {
        console.error(
            "Error loading analytics:",
            error
        );

        message.textContent =
            "Could not load article analytics.";

        chartContainer.hidden =
            true;
    }
}


// Displays the article view statistics as a line chart
// together with markers for published updates
function renderAnalytics(
    analytics
) {
    const message =
        document.getElementById(
            "analytics-message"
        );

    const chartContainer =
        document.getElementById(
            "chart-container"
        );

    const canvas =
        document.getElementById(
            "views-chart"
        );

    const comparisonContainer =
        document.getElementById(
            "update-comparison"
        );

    const views =
        analytics.views || [];

    const updates =
        analytics.updates || [];

    if (views.length === 0) {
        message.textContent =
            "No view statistics are available for this article yet.";

        chartContainer.hidden =
            true;

        comparisonContainer.textContent =
            "";

        if (viewsChart) {
            viewsChart.destroy();
            viewsChart = null;
        }

        return;
    }

    message.textContent = "";

    chartContainer.hidden =
        false;

    const labels =
        views.map((item) => {
            const date =
                new Date(
                    item.timestamp
                );

            return date.toLocaleString();
        });

    const viewCounts =
        views.map((item) => {
            return item.views;
        });

    const updateMarkers =
        createUpdateMarkers(
            views,
            updates
        );

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
                        label:
                            "Published update",
                        data:
                            updateMarkers,
                        type:
                            "scatter",
                        pointStyle:
                            "triangle",
                        pointRadius: 8,
                        pointHoverRadius:
                            10
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
                        text:
                            "Article Views Over Time"
                    },

                    tooltip: {
                        callbacks: {
                            label:
                                function (
                                    context
                                ) {
                                    if (
                                        context
                                            .dataset
                                            .label ===
                                        "Published update"
                                    ) {
                                        const marker =
                                            context.raw;

                                        return marker
                                            .updateText;
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
function createUpdateMarkers(
    views,
    updates
) {
    return updates.map(
        (update) => {
            const updateTime =
                new Date(
                    update.updatedAt
                ).getTime();

            let closestIndex = 0;

            let smallestDifference =
                Infinity;

            views.forEach(
                (view, index) => {
                    const viewTime =
                        new Date(
                            view.timestamp
                        ).getTime();

                    const difference =
                        Math.abs(
                            viewTime -
                            updateTime
                        );

                    if (
                        difference <
                        smallestDifference
                    ) {
                        smallestDifference =
                            difference;

                        closestIndex =
                            index;
                    }
                }
            );

            const closestDate =
                new Date(
                    views[
                        closestIndex
                    ].timestamp
                ).toLocaleString();

            return {
                x: closestDate,

                y:
                    views[
                        closestIndex
                    ].views,

                updateText:
                    update.edits ||
                    "Article published."
            };
        }
    );
}


// Displays a before-and-after comparison
// for every published article update
function renderUpdateComparisons(
    views,
    updates,
    container
) {
    container.textContent = "";

    if (updates.length === 0) {
        const message =
            document.createElement("p");

        message.textContent =
            "No published updates are recorded for this article yet.";

        container.appendChild(
            message
        );

        return;
    }

    const comparisonHeading =
        document.createElement("h3");

    comparisonHeading.textContent =
        "Views Before and After Updates";

    container.appendChild(
        comparisonHeading
    );

    updates.forEach((update) => {
        const comparison =
            calculateViewsAroundUpdate(
                views,
                update.updatedAt
            );

        const updateElement =
            document.createElement(
                "div"
            );

        updateElement.classList.add(
            "update-comparison-item"
        );

        const updateDate =
            new Date(
                update.updatedAt
            ).toLocaleString();

        const difference =
            comparison.after -
            comparison.before;

        let differenceText =
            difference.toString();

        if (difference > 0) {
            differenceText =
                `+${difference}`;
        }

        const updateHeading =
            document.createElement(
                "h4"
            );

        updateHeading.textContent =
            `Update: ${updateDate}`;

        const updateText =
            createLabelledParagraph(
                "Update: ",
                update.edits ||
                "Article published."
            );

        const beforeText =
            createLabelledParagraph(
                "Views in the 24 hours before: ",
                comparison.before
            );

        const afterText =
            createLabelledParagraph(
                "Views in the 24 hours after: ",
                comparison.after
            );

        const differenceElement =
            createLabelledParagraph(
                "Difference: ",
                differenceText
            );

        updateElement.appendChild(
            updateHeading
        );

        updateElement.appendChild(
            updateText
        );

        updateElement.appendChild(
            beforeText
        );

        updateElement.appendChild(
            afterText
        );

        updateElement.appendChild(
            differenceElement
        );

        container.appendChild(
            updateElement
        );
    });
}


// Creates a paragraph with a bold label
// and a text value
function createLabelledParagraph(
    label,
    value
) {
    const paragraph =
        document.createElement("p");

    const strong =
        document.createElement(
            "strong"
        );

    strong.textContent =
        label;

    paragraph.appendChild(
        strong
    );

    paragraph.append(
        String(value)
    );

    return paragraph;
}


// Calculates total views during the 24 hours
// before and after a published update
function calculateViewsAroundUpdate(
    views,
    updateTimestamp
) {
    const updateTime =
        new Date(
            updateTimestamp
        ).getTime();

    const twentyFourHours =
        24 * 60 * 60 * 1000;

    let before = 0;
    let after = 0;

    views.forEach((view) => {
        const viewTime =
            new Date(
                view.timestamp
            ).getTime();

        if (
            viewTime >=
            updateTime -
            twentyFourHours &&
            viewTime < updateTime
        ) {
            before += view.views;
        }

        if (
            viewTime >= updateTime &&
            viewTime <=
            updateTime +
            twentyFourHours
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
        document.getElementById(
            "review-container"
        );

    const message =
        document.getElementById(
            "analytics-message"
        );

    const chartContainer =
        document.getElementById(
            "chart-container"
        );

    const comparisonContainer =
        document.getElementById(
            "update-comparison"
        );

    reviewContainer.innerHTML =
        "<p>Select an article to review it.</p>";

    message.textContent =
        "Select an article to view its analytics.";

    comparisonContainer.textContent =
        "";

    chartContainer.hidden = true;

    if (viewsChart) {
        viewsChart.destroy();
        viewsChart = null;
    }
}