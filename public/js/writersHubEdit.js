let isDirty = false;
let autoSaveInterval = null;
let currentImageUrl = '';
let currentDraftStatus = 'draft';

const formElements = {
    title: document.getElementById('title'),
    category: document.getElementById('category'),
    summary: document.getElementById('summary'),
    content: document.getElementById('content')
};

document.addEventListener('DOMContentLoaded', async () => { //verification that the DOM is loaded before fetching categories
    await fetchCategories();

    if (window.articleId) { // checks if there's an aritcle id in the URL to validate if it's a new article or a draft to load
        await loadArticle(window.articleId);
        document.getElementById('btn-delete').style.display = 'inline-block'; // shows delete button if it's an existing article (and not a draft).
    }

    setupEventListeners();

    // Auto-save loop
    autoSaveInterval = setInterval(autoSave, 3000);
});

async function fetchCategories() {
    try {
        const res = await fetch('/api/articles/categories');
        const categories = await res.json();
        const select = document.getElementById('category');
        categories.forEach(cat => {
            if (cat) {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                select.appendChild(opt);
            }
        });
    } catch (err) {
        console.error('Error fetching categories', err);
    }
}

async function loadArticle(id) {
    try {
        const res = await fetch(`/api/articles/${id}?incrementViews=false`);
        const article = await res.json();

        let targetObj = article;
        if (article.draft) {
            targetObj = article.draft;
            currentDraftStatus = article.draft.status || 'draft';
        }

        formElements.title.value = targetObj.title || '';
        if (targetObj.category) {
            const select = formElements.category;
            if (!Array.from(select.options).some(opt => opt.value === targetObj.category)) {
                const opt = document.createElement('option');
                opt.className = 'custom-category-option';
                opt.value = targetObj.category;
                opt.textContent = targetObj.category;
                select.appendChild(opt);
            }
            select.value = targetObj.category;
            updateRemoveCategoryButton();
        }
        formElements.summary.value = targetObj.summary || '';
        formElements.content.value = targetObj.content || '';

        if (targetObj.imageUrl) {
            currentImageUrl = targetObj.imageUrl;
            showImagePreview(currentImageUrl);
        }

        if (currentDraftStatus === 'pending') {
            disableForm();
        }

        if (currentDraftStatus === 'rejected') {
            document.getElementById('save-status').innerHTML = 'Status: <span class="status-badge status-rejected">Returned for Revision</span>';
            await fetchNotes(id);
        }
    } catch (err) {
        console.error('Error loading article', err);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function fetchNotes(id) {
    try {
        const res = await fetch(`/api/notes?articleId=${id}&limit=100`);
        const notes = await res.json();
        const notesPanel = document.getElementById('notes-panel');
        const notesContent = document.getElementById('notes-content');

        if (!notesPanel || !notesContent) return;

        notesPanel.style.display = 'block';

        if (Array.isArray(notes) && notes.length > 0) {
            notesContent.innerHTML = notes.map(n => {
                const authorName = (n.author && (n.author.username || n.author.name)) || 'Editor';
                const roleBadge = n.author && n.author.role ? ` (${n.author.role})` : '';
                const dateObj = new Date(n.createdAt);
                const dateStr = dateObj.toLocaleDateString();
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return `
                    <div class="note-card">
                        <div class="note-card-header">
                            <span class="note-author">📝 ${escapeHtml(authorName)}${escapeHtml(roleBadge)}</span>
                            <span class="note-time">${dateStr} ${timeStr}</span>
                        </div>
                        <div class="note-card-content">${escapeHtml(n.content)}</div>
                    </div>
                `;
            }).join('');
        } else {
            notesContent.innerHTML = '<div class="no-notes-message">No revision notes recorded yet.</div>';
        }
    } catch (err) {
        console.error('Error fetching notes', err);
    }
}

function updateRemoveCategoryButton() {
    const select = formElements.category;
    const selectedOpt = select.options[select.selectedIndex];
    const removeBtn = document.getElementById('btn-remove-custom-category');
    if (selectedOpt && selectedOpt.classList.contains('custom-category-option')) {
        removeBtn.style.display = 'inline-block';
    } else {
        removeBtn.style.display = 'none';
    }
}

function removeCustomCategory() {
    const select = formElements.category;
    const existingCustom = select.querySelector('.custom-category-option');
    if (existingCustom) {
        existingCustom.remove();
    }
    select.value = '';
    updateRemoveCategoryButton();
    isDirty = true;
}

function disableForm() {
    formElements.title.disabled = true;
    formElements.category.disabled = true;
    formElements.summary.disabled = true;
    formElements.content.disabled = true;
    document.getElementById('image-upload').disabled = true;
    document.getElementById('btn-custom-category').disabled = true;
    if (document.getElementById('btn-remove-custom-category')) document.getElementById('btn-remove-custom-category').disabled = true;
    if (document.getElementById('custom-category-input')) document.getElementById('custom-category-input').disabled = true;
    if (document.getElementById('btn-apply-custom-category')) document.getElementById('btn-apply-custom-category').disabled = true;
    if (document.getElementById('btn-cancel-custom-category')) document.getElementById('btn-cancel-custom-category').disabled = true;
    if (document.getElementById('btn-remove-image')) document.getElementById('btn-remove-image').disabled = true;
    document.getElementById('btn-send-pending').disabled = true;
    document.getElementById('btn-delete').disabled = false;
    document.getElementById('btn-delete').style.display = 'inline-block';
    document.getElementById('save-status').textContent = 'Status: Pending (Read-only)';
    clearInterval(autoSaveInterval);
}

function showImagePreview(url) {
    const container = document.getElementById('image-preview-container');
    const img = document.getElementById('image-preview');
    if (url) {
        img.src = url;
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

function setupEventListeners() { // setting up event listeners for the form elements
    Object.values(formElements).forEach(el => {
        el.addEventListener('input', () => { isDirty = true; }); // sets dirty flag to true when user types something
    });

    formElements.category.addEventListener('change', () => {
        isDirty = true;
        updateRemoveCategoryButton();
    });

    const customContainer = document.getElementById('custom-category-container');
    const customInput = document.getElementById('custom-category-input');

    document.getElementById('btn-custom-category').addEventListener('click', () => {
        if (customContainer.style.display === 'none' || !customContainer.style.display) {
            customContainer.style.display = 'flex';
            customInput.focus();
        } else {
            customContainer.style.display = 'none';
            customInput.value = '';
        }
    });

    document.getElementById('btn-cancel-custom-category').addEventListener('click', () => {
        customContainer.style.display = 'none';
        customInput.value = '';
    });

    function applyCustomCategory() {
        const newCat = customInput.value.trim();
        if (!newCat) {
            alert('Please enter a category name.');
            return;
        }

        const select = formElements.category;

        // Check if category already exists in standard options
        const existingStdOption = Array.from(select.options).find(opt => opt.value.toLowerCase() === newCat.toLowerCase() && !opt.classList.contains('custom-category-option'));
        if (existingStdOption) {
            select.value = existingStdOption.value;
            // remove previous custom category if present
            const prevCustom = select.querySelector('.custom-category-option');
            if (prevCustom) prevCustom.remove();
        } else {
            // Delete previous custom category if it exists
            const prevCustom = select.querySelector('.custom-category-option');
            if (prevCustom) {
                prevCustom.remove();
            }

            // Add new custom category option
            const opt = document.createElement('option');
            opt.className = 'custom-category-option';
            opt.value = newCat;
            opt.textContent = newCat;
            select.appendChild(opt);
            select.value = newCat;
        }

        isDirty = true;
        updateRemoveCategoryButton();
        customContainer.style.display = 'none';
        customInput.value = '';
    }

    document.getElementById('btn-apply-custom-category').addEventListener('click', applyCustomCategory);
    customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyCustomCategory();
        } else if (e.key === 'Escape') {
            customContainer.style.display = 'none';
            customInput.value = '';
        }
    });

    document.getElementById('btn-remove-custom-category').addEventListener('click', () => {
        removeCustomCategory();
    });

    document.getElementById('image-upload').addEventListener('change', async (e) => { // upload image
        const file = e.target.files[0]; // gets the uploaded image
        if (!file) return; // if no image is uploaded, it returns

        const reader = new FileReader(); // creates a new file reader
        reader.onload = async (ev) => { // when the file reader loads, it converts the image to base64
            const base64 = ev.target.result; // converts the image to base64 for 
            try {
                const res = await fetch('/WritersHub/upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64, filename: file.name })
                });
                const data = await res.json();
                if (data.imageUrl) { // if an image was uploaded, it sets the current image URL and shows the image preview
                    currentImageUrl = data.imageUrl;
                    showImagePreview(currentImageUrl);
                    isDirty = true; // sets the dirty flag to true
                }
            } catch (err) {
                console.error("Upload failed", err);
            }
        };
        reader.readAsDataURL(file); // converts the file to base64 to upload to the server
    });

    document.getElementById('btn-remove-image').addEventListener('click', async () => {
        if (currentImageUrl) {
            try {
                await fetch('/WritersHub/remove-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: currentImageUrl })
                });
                currentImageUrl = ''; // removing the current image URL
                showImagePreview(''); // removing the image preview
                document.getElementById('image-upload').value = ''; // removing the uploaded image
                isDirty = true; // sets the dirty flag to true
            } catch (err) {
                console.error("Remove failed", err);
            }
        }
    });

    document.getElementById('btn-send-pending').addEventListener('click', async () => {
        // Validate required fields
        if (!formElements.title.value.trim() || !formElements.summary.value.trim() || !formElements.content.value.trim()) {
            alert('Please fill out all required fields before submitting to Editor.'); // alerts the user if the fields are empty, before sending to pending.
            return;
        }

        clearInterval(autoSaveInterval); //stops the auto-save interval before sending to pending to prevent auto-save from overriding the draft status when it's sent to pending
        currentDraftStatus = 'pending'; // changes the current draft status to pending
        isDirty = true; // set isDirty to true to allow the autosave to run
        const success = await autoSave(); // saves the draft before sending it to pending
        if (success) {
            window.location.href = '/WritersHub'; // redirects the user to the writers hub
        } else {
            alert('Failed to submit article for review. Please try again.');
        }
    });

    document.getElementById('btn-delete').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this draft?')) {
            try {
                await fetch(`/api/articles/${window.articleId}`, { method: 'DELETE' }); // deletes the article from the DB
                window.location.href = '/WritersHub'; // redirects the user to the writers hub
            } catch (err) {
                alert('Error deleting article');
            }
        }
    });
}

async function autoSave() {
    if (!isDirty) return false; // return if the content hasn't been edited

    const payload = {
        title: formElements.title.value.trim(), // trimming whitespace from the title
        category: formElements.category.value, // gets the category from the select element
        summary: formElements.summary.value.trim(), // trimming whitespace from the summary
        content: formElements.content.value.trim(), // trimming whitespace from the content
        imageUrl: currentImageUrl, // gets the image URL
        draftStatus: currentDraftStatus, // gets the draft status
        author: window.currentUserId // gets the author ID
    };

    document.getElementById('save-status').textContent = 'Saving...'; // shows the save status
    try {
        let res;
        if (window.articleId) { // if there is an article ID, it updates the article
            res = await fetch(`/api/articles/${window.articleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // First time saving, create article
            const createPayload = {
                title: '', // Root title remains blank until published/approved by an editor
                author: window.currentUserId,
                status: 'unpublished',
                draft: { ...payload, status: payload.draftStatus || 'draft' } // if sent to pending will be pending. If not, by default the draft status for an ew article must be sradt since iwt wa never approved until now. 
            };
            res = await fetch(`/api/articles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createPayload)
            });
            const data = await res.json();
            if (data._id) {
                window.articleId = data._id;
                document.getElementById('btn-delete').style.display = 'inline-block'; // show the delete button
                // Change URL without reloading
                window.history.replaceState({}, '', `/WritersHub/edit/${data._id}`); // updates the url to include the article id without reloading the page
            }
        }

        if (!res.ok) {
            throw new Error(`Server responded with ${res.status}`);
        }

        isDirty = false;
        const now = new Date().toLocaleTimeString(); // gets the current time as a string (e.g. "12:00 PM")
        if (currentDraftStatus === 'rejected') {
            document.getElementById('save-status').innerHTML = `Status: <span class="status-badge status-rejected">Returned for Revision</span> (Last auto-saved at ${now})`;
        } else {
            document.getElementById('save-status').textContent = `Last auto-saved at ${now}`;
        }
        return true;
    } catch (err) {
        console.error('Autosave failed', err); // logs the error
        document.getElementById('save-status').textContent = 'Auto-save failed!'; // sets the save status to "Auto-save failed!"
        return false;
    }
}
