const loginPanel = document.querySelector('#loginPanel');
const dashboard = document.querySelector('#dashboard');
const loginForm = document.querySelector('#loginForm');
const productForm = document.querySelector('#productForm');
const loginMessage = document.querySelector('#loginMessage');
const productMessage = document.querySelector('#productMessage');
const dashboardNotice = document.querySelector('#dashboardNotice');
const productList = document.querySelector('#productList');
const productCount = document.querySelector('#productCount');
const orderList = document.querySelector('#orderList');
const orderCount = document.querySelector('#orderCount');
const saveButton = document.querySelector('#saveButton');
let editingSlug = '';
let pendingImageUploads = 0;

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
    if (/^\/uploads\/[a-f0-9]{32}\.(?:jpg|png|webp)$/.test(value)) return value;
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function imageUrlsFromField(field) {
  return field.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
}

function renderImagePreview(container, urls, removable = false) {
  container.replaceChildren();
  urls.forEach((url, index) => {
    const image = document.createElement('img');
    image.src = productImageUrl(url);
    image.alt = `Product image ${index + 1} preview`;
    image.loading = 'lazy';
    image.addEventListener('error', () => image.classList.add('image-preview-error'), { once: true });
    container.append(image);
    if (removable) {
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'image-preview-remove';
      removeButton.dataset.removeImage = String(index);
      removeButton.setAttribute('aria-label', `Remove gallery image ${index + 1}`);
      removeButton.textContent = '×';
      container.append(removeButton);
    }
  });
}

async function uploadProductImage(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Each image must be 5 MB or smaller.');
  const response = await fetch('/api/admin/product-images', {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    body: file
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Image upload failed (${response.status}).`);
  return data.url;
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

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value));
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
        <p>${escapeHtml(product.variant)} · ${escapeHtml(product.style)} · ${escapeHtml(product.ageGroup)} · ${product.inStock === false ? 'Out of stock' : 'In stock'}</p>
        <div class="product-row-price">${formatMoney(product.price)}</div>
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

function renderOrders(orders) {
  orderCount.textContent = orders.length;
  if (!orders.length) {
    orderList.innerHTML = '<div class="empty-state">No orders yet. New customer orders will appear here.</div>';
    return;
  }
  const statuses = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
  orderList.innerHTML = orders.map((order) => `<article class="order-card">
    <div class="order-card-heading"><div><strong>${escapeHtml(order.trackingCode)}</strong><small>${new Date(order.createdAt).toLocaleString()}</small></div><strong>${formatMoney(order.total)}</strong></div>
    <p><strong>${escapeHtml(order.customerName)}</strong> · ${escapeHtml(order.email)} · ${escapeHtml(order.phone)}</p>
    <p>${escapeHtml(order.address.line1)}${order.address.line2 ? `, ${escapeHtml(order.address.line2)}` : ''}, ${escapeHtml(order.address.city)}, ${escapeHtml(order.address.region)} ${escapeHtml(order.address.postalCode)}, ${escapeHtml(order.address.country)}</p>
    <p>${order.items.map((item) => `${escapeHtml(item.name)} × ${item.quantity}`).join(' · ')} · ${escapeHtml(order.paymentMethod.toUpperCase())} · Payment: ${escapeHtml(order.paymentStatus)}${order.giftWrap ? ' · Gift wrap requested' : ''}</p>
    ${order.giftMessage ? `<p class="order-gift-note">Gift note: “${escapeHtml(order.giftMessage)}”</p>` : ''}
    <form class="order-update" data-order-form="${escapeHtml(order.trackingCode)}">
      <label>STATUS<select name="status">${statuses.map((status) => `<option value="${status}" ${status === order.status ? 'selected' : ''}>${status.replaceAll('_', ' ')}</option>`).join('')}</select></label>
      ${order.paymentMethod === 'cod' && order.paymentStatus !== 'paid' ? '<label class="order-payment-check"><input type="checkbox" name="paymentReceived"> COD collected</label>' : ''}
      <button type="submit" class="quiet-button">Update order</button>
    </form>
  </article>`).join('');
}

async function loadOrders() {
  try {
    const orders = await request('/api/admin/orders');
    renderOrders(orders);
  } catch (error) {
    showMessage(dashboardNotice, error.message);
    dashboardNotice.hidden = false;
  }
}

function resetForm() {
  editingSlug = '';
  productForm.reset();
  renderImagePreview(document.querySelector('#mainImagePreview'), []);
  renderImagePreview(document.querySelector('#galleryImagePreview'), [], true);
  document.querySelector('#editorEyebrow').textContent = 'NEW PIECE';
  document.querySelector('#editorTitle').textContent = 'Add a toy';
  saveButton.innerHTML = 'Save toy <span>→</span>';
  showMessage(productMessage, '');
}

function editProduct(product) {
  editingSlug = product.slug;
  for (const field of ['name', 'price', 'style', 'variant', 'ageGroup', 'imageClass', 'badge', 'imageUrl', 'description', 'materials', 'dimensions', 'care']) {
    productForm.elements[field].value = product[field] ?? '';
  }
  productForm.elements.inStock.value = String(product.inStock !== false);
  productForm.elements.images.value = (product.images || []).join('\n');
  renderImagePreview(document.querySelector('#mainImagePreview'), product.imageUrl ? [product.imageUrl] : []);
  renderImagePreview(document.querySelector('#galleryImagePreview'), product.images || [], true);
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
    await Promise.all([loadProducts(), loadOrders()]);
  } catch (error) {
    showMessage(loginMessage, error.message);
  } finally {
    button.disabled = false;
  }
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(productMessage, '');
  if (pendingImageUploads) {
    showMessage(productMessage, 'Wait for the product photo upload to finish before saving.');
    return;
  }
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

productForm.elements.imageFile.addEventListener('change', async (event) => {
  const input = event.currentTarget;
  const file = input.files[0];
  if (!file) return;
  pendingImageUploads += 1;
  input.disabled = true;
  showMessage(productMessage, 'Uploading the main product photo…');
  try {
    const url = await uploadProductImage(file);
    productForm.elements.imageUrl.value = url;
    renderImagePreview(document.querySelector('#mainImagePreview'), [url]);
    showMessage(productMessage, 'Main product photo uploaded.');
  } catch (error) {
    showMessage(productMessage, error.message);
  } finally {
    pendingImageUploads -= 1;
    input.disabled = false;
    input.value = '';
  }
});

productForm.elements.imageFiles.addEventListener('change', async (event) => {
  const input = event.currentTarget;
  const files = [...input.files];
  if (!files.length) return;
  const imageField = productForm.elements.images;
  const existingUrls = imageUrlsFromField(imageField);
  if (existingUrls.length + files.length > 5) {
    showMessage(productMessage, `You can add ${Math.max(0, 5 - existingUrls.length)} more gallery photo(s).`);
    input.value = '';
    return;
  }
  pendingImageUploads += 1;
  input.disabled = true;
  showMessage(productMessage, 'Uploading gallery photos…');
  try {
    const uploadedUrls = [];
    for (const file of files) uploadedUrls.push(await uploadProductImage(file));
    imageField.value = [...existingUrls, ...uploadedUrls].join('\n');
    renderImagePreview(document.querySelector('#galleryImagePreview'), imageUrlsFromField(imageField), true);
    showMessage(productMessage, `${uploadedUrls.length} gallery photo(s) uploaded.`);
  } catch (error) {
    showMessage(productMessage, error.message);
  } finally {
    pendingImageUploads -= 1;
    input.disabled = false;
    input.value = '';
  }
});

productForm.elements.imageUrl.addEventListener('input', (event) => {
  const url = event.currentTarget.value.trim();
  renderImagePreview(document.querySelector('#mainImagePreview'), url ? [url] : []);
});
productForm.elements.images.addEventListener('input', (event) => {
  renderImagePreview(document.querySelector('#galleryImagePreview'), imageUrlsFromField(event.currentTarget), true);
});
document.querySelector('#galleryImagePreview').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-image]');
  if (!button) return;
  const imageField = productForm.elements.images;
  const urls = imageUrlsFromField(imageField);
  urls.splice(Number(button.dataset.removeImage), 1);
  imageField.value = urls.join('\n');
  renderImagePreview(document.querySelector('#galleryImagePreview'), urls, true);
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

orderList.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-order-form]');
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  const fields = new FormData(form);
  try {
    await request(`/api/admin/orders/${encodeURIComponent(form.dataset.orderForm)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: fields.get('status'), paymentReceived: fields.get('paymentReceived') === 'on' })
    });
    await loadOrders();
    showMessage(dashboardNotice, 'Order updated.');
    dashboardNotice.hidden = false;
  } catch (error) {
    showMessage(dashboardNotice, error.message);
    dashboardNotice.hidden = false;
    button.disabled = false;
  }
});

document.querySelector('#newProductButton').addEventListener('click', () => {
  resetForm();
  document.querySelector('#editorPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  productForm.elements.name.focus({ preventScroll: true });
});
document.querySelector('#cancelEditButton').addEventListener('click', resetForm);
document.querySelector('#refreshButton').addEventListener('click', loadProducts);
document.querySelector('#refreshOrdersButton').addEventListener('click', loadOrders);
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
    await Promise.all([loadProducts(), loadOrders()]);
  }
} catch (error) {
  showMessage(loginMessage, error.message);
}
