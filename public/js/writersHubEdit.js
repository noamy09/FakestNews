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
        const res = await fetch(`/api/articles/${id}`);
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
                opt.value = targetObj.category;
                opt.textContent = targetObj.category;
                select.appendChild(opt);
            }
            select.value = targetObj.category;
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
            await fetchNotes(id);
        }
    } catch (err) {
        console.error('Error loading article', err);
    }
}

async function fetchNotes(id) {
    try {
        const res = await fetch(`/api/notes?articleId=${id}`);
        const notes = await res.json();
        const notesPanel = document.getElementById('notes-panel');
        const notesContent = document.getElementById('notes-content');

        if (notes && notes.length > 0) {
            notesPanel.style.display = 'block';
            notesContent.innerHTML = notes.map(n => `<div style="margin-bottom:10px; border-bottom:1px solid #ddd; padding-bottom:10px;"><strong>${new Date(n.createdAt).toLocaleDateString()}</strong><br>${n.content}</div>`).join('');
        }
    } catch (err) {
        console.error('Error fetching notes', err);
    }
}

function disableForm() {
    formElements.title.disabled = true;
    formElements.category.disabled = true;
    formElements.summary.disabled = true;
    formElements.content.disabled = true;
    document.getElementById('image-upload').disabled = true;
    document.getElementById('btn-custom-category').disabled = true;
    if (document.getElementById('btn-remove-image')) document.getElementById('btn-remove-image').disabled = true;
    document.getElementById('btn-send-pending').disabled = true;
    document.getElementById('btn-delete').disabled = true;
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

    document.getElementById('btn-custom-category').addEventListener('click', () => { // add custom category to the custom category select element
        const newCat = prompt("Enter new category name:");
        if (newCat) { // if a user added a new category, it adds it to the select element and sets the dirty flag to true
            const select = formElements.category; // gets the category select element
            const opt = document.createElement('option'); // creates a new option element
            opt.value = newCat; // sets the value of the new option to the new category
            opt.textContent = newCat; // sets the text content of the new option to the new category
            select.appendChild(opt); // appends the new option to the select element
            select.value = newCat; // sets the value of the select element to the new category
            isDirty = true; // sets the dirty flag to true
        } // the end goal is to allow the writers to add a custom category to their articles, and update the categories in the DB when the article is sent to pending (in the future)
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
        if (!formElements.title.value.trim() || !formElements.category.value || !formElements.summary.value.trim() || !formElements.content.value.trim()) {
            alert('Please fill out all required fields before submitting to Editor.'); // alerts the user if the fields are empty, before sending to pending.
            return;
        }

        currentDraftStatus = 'pending'; // changes the current draft status to pending
        isDirty = true; // sets the dirty flag to true
        await autoSave(); // auto saves the draft before sending it to pending
        window.location.href = '/WritersHub'; // redirects the user to the writers hub
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
    if (!isDirty || currentDraftStatus === 'pending') return; // return if the content hasn't been edited

    const payload = {
        title: formElements.title.value.trim(), // trimming whitespace from the title
        category: formElements.category.value, // gets the category from the select element
        summary: formElements.summary.value.trim(), // trimming whitespace from the summary
        content: formElements.content.value.trim(), // trimming whitespace from the content
        imageUrl: currentImageUrl, // gets the image URL
        draftStatus: currentDraftStatus, // gets the draft status
        author: window.dummyAuthorId // gets the author ID
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
            // For a brand new article, the API creates it with status="unpublished", draftStatus is not natively supported in POST /api/articles
            // Wait, createArticle in articlesServices.js just saves req.body as new Article
            // We should structure it so draft is populated.
            const createPayload = {
                title: payload.title || 'Untitled',
                author: window.dummyAuthorId,
                status: 'unpublished',
                draft: { ...payload, status: 'draft' }
            };
            res = await fetch(`/api/articles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createPayload)
            });
            const data = await res.json();
            if (data._id) {
                window.articleId = data._id;
                document.getElementById('btn-delete').style.display = 'inline-block';
                // Change URL without reloading
                window.history.replaceState({}, '', `/WritersHub/edit/${data._id}`);
            }
        }

        isDirty = false;
        const now = new Date().toLocaleTimeString(); // gets the current time as a string (e.g. "12:00 PM")
        document.getElementById('save-status').textContent = `Last auto-saved at ${now}`; // sets the save status to the current time
    } catch (err) {
        console.error('Autosave failed', err); // logs the error
        document.getElementById('save-status').textContent = 'Auto-save failed!'; // sets the save status to "Auto-save failed!"
    }
}
