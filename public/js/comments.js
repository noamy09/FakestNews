(function () {
  const section = document.getElementById('comments');
  if (!section) return;

  const articleId = section.dataset.articleId;
  const endpoint = `/api/articles/${encodeURIComponent(articleId)}/comments`;
  const form = document.getElementById('comment-form');
  const nameInput = document.getElementById('comment-name');
  const contentInput = document.getElementById('comment-content');
  const submitBtn = document.getElementById('comment-submit');
  const statusEl = document.getElementById('comment-status');
  const charCount = document.getElementById('comment-char-count');
  const list = document.getElementById('comment-list');
  const countEl = document.getElementById('comments-count');
  const emptyEl = document.getElementById('comments-empty');
  const moreBtn = document.getElementById('comments-more');
  const NAME_KEY = 'fakest_news_comment_name';
  const SUBMIT_LABEL = submitBtn.textContent;

  let nextCursor = section.dataset.nextCursor || null;
  let cooldownTimer = null;
  let submitting = false;

  const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const setStatus = (message, type = '') => {
    statusEl.textContent = message;
    statusEl.dataset.type = type;
  };

  const updateCount = (delta) => {
    countEl.textContent = String(Math.max(0, Number(countEl.textContent || 0) + delta));
    emptyEl.hidden = list.children.length > 0;
  };

  const updateCharCount = () => {
    charCount.textContent = `${contentInput.value.length} / ${contentInput.maxLength}`;
  };

  // Built with textContent only, so user-supplied text can never be interpreted as HTML.
  const renderComment = ({ _id, authorName, content, createdAt }, { pending = false } = {}) => {
    const item = document.createElement('li');
    item.className = 'comment';
    if (pending) item.classList.add('is-pending');
    if (_id) item.dataset.id = _id;

    const meta = document.createElement('div');
    meta.className = 'comment-meta';

    const author = document.createElement('span');
    author.className = 'comment-author';
    author.textContent = authorName || 'Anonymous';

    const time = document.createElement('time');
    const date = new Date(createdAt);
    time.dateTime = date.toISOString();
    time.textContent = pending ? 'Posting…' : dateFormat.format(date);

    const body = document.createElement('p');
    body.className = 'comment-content';
    body.textContent = content;

    meta.append(author, time);
    item.append(meta, body);
    return item;
  };

  const confirmComment = (item, saved) => {
    item.classList.remove('is-pending');
    item.dataset.id = saved._id;
    // The server may normalize the text (whitespace, logged-in username), so show what was actually saved.
    item.querySelector('.comment-author').textContent = saved.authorName;
    item.querySelector('.comment-content').textContent = saved.content;
    const time = item.querySelector('time');
    time.dateTime = new Date(saved.createdAt).toISOString();
    time.textContent = dateFormat.format(new Date(saved.createdAt));
  };

  const startCooldown = (seconds) => {
    clearInterval(cooldownTimer);
    let remaining = seconds;
    submitBtn.disabled = true;
    const tick = () => {
      if (remaining <= 0) {
        clearInterval(cooldownTimer);
        submitBtn.disabled = false;
        submitBtn.textContent = SUBMIT_LABEL;
        setStatus('');
        return;
      }
      submitBtn.textContent = `Wait ${remaining}s`;
      remaining -= 1;
    };
    tick();
    cooldownTimer = setInterval(tick, 1000);
  };

  const validate = (authorName, content) => {
    if (!authorName) return { field: nameInput, message: 'Please enter your name.' };
    if (!content) return { field: contentInput, message: 'Please write a comment.' };
    return null;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting || submitBtn.disabled) return;

    const authorName = nameInput.value.trim();
    const content = contentInput.value.trim();
    const invalid = validate(authorName, content);
    if (invalid) {
      setStatus(invalid.message, 'error');
      invalid.field.focus();
      return;
    }

    submitting = true;
    submitBtn.disabled = true;
    setStatus('');

    const optimistic = renderComment({ authorName, content, createdAt: Date.now() }, { pending: true });
    list.prepend(optimistic);
    updateCount(1);
    contentInput.value = '';
    updateCharCount();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ authorName, content })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || 'Could not post your comment. Please try again.');
        error.status = response.status;
        error.retryAfter = data.retryAfter || Number(response.headers.get('Retry-After')) || 0;
        throw error;
      }

      confirmComment(optimistic, data);
      try { localStorage.setItem(NAME_KEY, authorName); } catch (_) { /* storage unavailable */ }
      setStatus('Comment posted.', 'success');
      submitBtn.disabled = false;
    } catch (error) {
      optimistic.remove();
      updateCount(-1);
      contentInput.value = content; // give the text back so nothing typed is lost
      updateCharCount();

      if (error.status === 429) {
        setStatus(error.message, 'error');
        startCooldown(error.retryAfter || 60);
      } else {
        setStatus(error.status ? error.message : 'Network error. Please check your connection and try again.', 'error');
        submitBtn.disabled = false;
      }
    } finally {
      submitting = false;
    }
  });

  moreBtn.addEventListener('click', async () => {
    if (!nextCursor) return;
    moreBtn.disabled = true;
    moreBtn.textContent = 'Loading…';
    try {
      const response = await fetch(`${endpoint}?before=${encodeURIComponent(nextCursor)}`, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const seen = new Set([...list.children].map((li) => li.dataset.id));
      const fragment = document.createDocumentFragment();
      data.comments
        .filter((comment) => !seen.has(comment._id))
        .forEach((comment) => fragment.append(renderComment(comment)));
      list.append(fragment);
      nextCursor = data.nextCursor;
      moreBtn.hidden = !data.hasMore;
    } catch (_) {
      setStatus('Could not load more comments.', 'error');
    } finally {
      moreBtn.disabled = false;
      moreBtn.textContent = 'Load older comments';
    }
  });

  contentInput.addEventListener('input', updateCharCount);

  // Re-render server timestamps in the reader's own timezone.
  list.querySelectorAll('time[datetime]').forEach((time) => {
    time.textContent = dateFormat.format(new Date(time.dateTime));
  });

  try {
    const savedName = localStorage.getItem(NAME_KEY);
    if (savedName) nameInput.value = savedName;
  } catch (_) { /* storage unavailable */ }
  updateCharCount();
})();
