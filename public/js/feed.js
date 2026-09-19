document.addEventListener("DOMContentLoaded", () => {
  let currentPage = 1;
  let isLoading = false;
  let hasMore = true;

  const grid = document.getElementById("articles-grid");
  const sentinel = document.getElementById("scroll-sentinel");
  const loadingText = document.getElementById("loading-text");

  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const readFilter = document.getElementById("read-filter");
  const sortFilter = document.getElementById("sort-filter");

  function getReadArticles() {
    return JSON.parse(localStorage.getItem("fakest_news_read_articles") || "[]");
  }

  function markReadStatus() {
    const readIds = getReadArticles();
    document.querySelectorAll(".article-card").forEach(card => {
      const id = card.getAttribute("data-id");
      if (readIds.includes(id)) {
        card.classList.add("is-read");
      }
    });
  }

  markReadStatus();

  function renderArticleCard(article) {
    const isRead = getReadArticles().includes(article._id);
    const card = document.createElement("article");
    card.className = `article-card ${isRead ? "is-read" : ""}`;
    card.setAttribute("data-id", article._id);

    const authorName = article.author ? (article.author.name || article.author.username) : "Staff";
    const dateStr = new Date(article.createdAt).toLocaleDateString("en-US");

    card.innerHTML = `
      <img src="${article.imageUrl || '/images/placeholder.jpg'}" alt="${article.title}">
      <div class="card-content">
        <span class="badge">${article.category}</span>
        <h2><a href="/articles/view/${article._id}">${article.title}</a></h2>
        <p class="summary">${article.summary}</p>
        <div class="card-meta">
          <span>By: ${authorName}</span>
          <span>${dateStr}</span>
        </div>
      </div>
    `;
    return card;
  }

  async function fetchArticles(pageToLoad, replace = false) {
    if (isLoading) return;
    isLoading = true;
    if (loadingText) loadingText.style.display = "block";

    const params = new URLSearchParams({
      page: pageToLoad,
      search: searchInput ? searchInput.value.trim() : "",
      category: categoryFilter ? categoryFilter.value : "",
      sort: sortFilter ? sortFilter.value : ""
    });

    try {
      const res = await fetch(`/articles/api/feed?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        if (replace && grid) {
          grid.innerHTML = "";
        }

        const readStatus = readFilter ? readFilter.value : "";
        const readIds = getReadArticles();

        data.articles.forEach(article => {
          const isRead = readIds.includes(article._id);
          if (readStatus === "read" && !isRead) return;
          if (readStatus === "unread" && isRead) return;

          if (grid) grid.appendChild(renderArticleCard(article));
        });

        if (data.articles.length < 20) {
          hasMore = false;
          if (loadingText) loadingText.textContent = "No more articles to load.";
        } else {
          hasMore = true;
          if (loadingText) loadingText.textContent = "Loading more articles...";
        }

        currentPage = pageToLoad;
      }
    } catch (err) {
      console.error("Error loading articles via Ajax:", err);
      if (loadingText) loadingText.textContent = "Failed to load articles.";
    } finally {
      isLoading = false;
    }
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore && !isLoading) {
      fetchArticles(currentPage + 1, false);
    }
  }, { rootMargin: "250px" });

  if (sentinel) observer.observe(sentinel);

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchArticles(1, true);
      }, 350);
    });
  }

  if (categoryFilter) categoryFilter.addEventListener("change", () => fetchArticles(1, true));
  if (sortFilter) sortFilter.addEventListener("change", () => fetchArticles(1, true));
  if (readFilter) readFilter.addEventListener("change", () => fetchArticles(1, true));
});