const loginPanel = document.querySelector('#loginPanel');
const dashboard = document.querySelector('#dashboard');
const loginForm = document.querySelector('#loginForm');
const productForm = document.querySelector('#productForm');
const loginMessage = document.querySelector('#loginMessage');
const productMessage = document.querySelector('#productMessage');
const dashboardNotice = document.querySelector('#dashboardNotice');
const productList = document.querySelector('#productList');
const productCount = document.querySelector('#productCount');
const saveButton = document.querySelector('#saveButton');
let editingSlug = '';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function productImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function showMessage(element, message) {
  element.textContent = message;
}

function displayDashboard() {
  loginPanel.hidden = true;
  dashboard.hidden = false;
}

function displayLogin() {
  dashboard.hidden = true;
  loginPanel.hidden = false;
}

function renderProducts(products) {
  productCount.textContent = products.length;
  if (!products.length) {
    productList.innerHTML = '<div class="empty-state"><strong>A little room for wonder.</strong>Your collection is empty. Add your first toy to get started.</div>';
    return;
  }
  productList.innerHTML = products.map((product) => {
    const imageUrl = productImageUrl(product.imageUrl);
    const imageMarkup = imageUrl
      ? `<img class="product-thumb" src="${escapeHtml(imageUrl)}" alt="" loading="lazy">`
      : `<div class="product-thumb product-thumb-fallback">${escapeHtml(product.imageClass || 'Toy')}<br>illustration</div>`;
    return `<article class="product-row">
      ${imageMarkup}
      <div class="product-row-info">
        <strong>${escapeHtml(product.name)}</strong>
        <p>${escapeHtml(product.variant)} · ${escapeHtml(product.style)} · ${escapeHtml(product.ageGroup)}</p>
        <div class="product-row-price">$${Number(product.price).toFixed(2)}</div>
      </div>
      <div class="row-actions">
        <button type="button" data-edit="${escapeHtml(product.slug)}">Edit</button>
        <button type="button" class="delete-button" data-delete="${escapeHtml(product.slug)}">Remove</button>
      </div>
    </article>`;
  }).join('');
}

async function loadProducts() {
  dashboardNotice.hidden = true;
  try {
    const products = await request('/api/admin/products');
    renderProducts(products);
  } catch (error) {
    showMessage(dashboardNotice, error.message);
    dashboardNotice.hidden = false;
    if (error.message.includes('sign in')) displayLogin();
  }
}

function resetForm() {
  editingSlug = '';
  productForm.reset();
  document.querySelector('#editorEyebrow').textContent = 'NEW PIECE';
  document.querySelector('#editorTitle').textContent = 'Add a toy';
  saveButton.innerHTML = 'Save toy <span>→</span>';
  showMessage(productMessage, '');
}

function editProduct(product) {
  editingSlug = product.slug;
  for (const field of ['name', 'price', 'style', 'variant', 'ageGroup', 'imageClass', 'badge', 'imageUrl']) {
    productForm.elements[field].value = product[field] ?? '';
  }
  document.querySelector('#editorEyebrow').textContent = 'UPDATE PIECE';
  document.querySelector('#editorTitle').textContent = 'Edit this toy';
  saveButton.innerHTML = 'Save changes <span>→</span>';
  showMessage(productMessage, '');
  document.querySelector('#editorPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  productForm.elements.name.focus({ preventScroll: true });
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(loginMessage, '');
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await request('/api/admin/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(loginForm))) });
    loginForm.reset();
    displayDashboard();
    await loadProducts();
  } catch (error) {
    showMessage(loginMessage, error.message);
  } finally {
    button.disabled = false;
  }
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(productMessage, '');
  saveButton.disabled = true;
  const payload = Object.fromEntries(new FormData(productForm));
  try {
    await request(editingSlug ? `/api/admin/products/${encodeURIComponent(editingSlug)}` : '/api/admin/products', {
      method: editingSlug ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    resetForm();
    await loadProducts();
    showMessage(dashboardNotice, 'Product saved. It is now available in your shop.');
    dashboardNotice.hidden = false;
  } catch (error) {
    showMessage(productMessage, error.message);
  } finally {
    saveButton.disabled = false;
  }
});

productList.addEventListener('click', async (event) => {
  const editButton = event.target.closest('[data-edit]');
  const deleteButton = event.target.closest('[data-delete]');
  if (editButton) {
    try {
      const products = await request('/api/admin/products');
      const product = products.find((item) => item.slug === editButton.dataset.edit);
      if (product) editProduct(product);
    } catch (error) {
      showMessage(dashboardNotice, error.message);
      dashboardNotice.hidden = false;
    }
  }
  if (deleteButton && window.confirm('Remove this toy from the shop? This cannot be undone.')) {
    deleteButton.disabled = true;
    try {
      await request(`/api/admin/products/${encodeURIComponent(deleteButton.dataset.delete)}`, { method: 'DELETE' });
      if (editingSlug === deleteButton.dataset.delete) resetForm();
      await loadProducts();
      showMessage(dashboardNotice, 'Product removed from the shop.');
      dashboardNotice.hidden = false;
    } catch (error) {
      showMessage(dashboardNotice, error.message);
      dashboardNotice.hidden = false;
      deleteButton.disabled = false;
    }
  }
});

document.querySelector('#newProductButton').addEventListener('click', () => {
  resetForm();
  document.querySelector('#editorPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  productForm.elements.name.focus({ preventScroll: true });
});
document.querySelector('#cancelEditButton').addEventListener('click', resetForm);
document.querySelector('#refreshButton').addEventListener('click', loadProducts);
document.querySelector('#logoutButton').addEventListener('click', async () => {
  try {
    await request('/api/admin/logout', { method: 'POST' });
    displayLogin();
    showMessage(loginMessage, 'You have signed out.');
  } catch (error) {
    showMessage(dashboardNotice, error.message);
    dashboardNotice.hidden = false;
  }
});

try {
  const session = await request('/api/admin/session');
  if (!session.configured) {
    showMessage(document.querySelector('#setupNotice'), 'Admin sign-in is disabled until ADMIN_USERNAME, ADMIN_PASSWORD, and a 32-character ADMIN_SESSION_SECRET are set for the server.');
    document.querySelector('#setupNotice').hidden = false;
    loginForm.querySelector('button[type="submit"]').disabled = true;
  } else if (session.authenticated) {
    displayDashboard();
    await loadProducts();
  }
} catch (error) {
  showMessage(loginMessage, error.message);
}
