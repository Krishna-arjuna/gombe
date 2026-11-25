const fallbackProducts = [
  { name: 'Rani & Raja', slug: 'rani-raja', price: 68, style: 'Classic', ageGroup: '3+ years', variant: 'Set of 2', badge: 'Bestseller', imageClass: 'royal', rating: 4.9, reviews: 132 },
  { name: 'Dancing Peacock', slug: 'dancing-peacock', price: 42, style: 'Animal friends', ageGroup: '3+ years', variant: 'Hand carved', badge: 'New', imageClass: 'peacock', rating: 4.8, reviews: 76 },
  { name: 'Wobble Family', slug: 'wobble-family', price: 58, style: 'Playful', ageGroup: '1+ years', variant: 'Set of 3', badge: '', imageClass: 'wobble', rating: 5, reviews: 48 },
  { name: 'The Little Menagerie', slug: 'little-menagerie', price: 76, style: 'Animal friends', ageGroup: '3+ years', variant: 'Set of 5', badge: 'Gift ready', imageClass: 'menagerie', rating: 4.9, reviews: 91 },
  { name: 'Storyteller Set', slug: 'storyteller-set', price: 84, style: 'Classic', ageGroup: '6+ years', variant: 'Set of 4', badge: '', imageClass: 'story', rating: 4.8, reviews: 42 },
  { name: 'Tiny Top Trio', slug: 'tiny-top-trio', price: 36, style: 'Playful', ageGroup: '1+ years', variant: 'Set of 3', badge: 'Small joy', imageClass: 'tops', rating: 4.9, reviews: 65 }
];

let products = [...fallbackProducts];
let visibleCount = 4;
let sortMode = 'featured';
let activeCollection = 'All collections';
let cart = [];
let wishlist = new Set();
let customer = null;
let accountSaveQueue = Promise.resolve();
let pendingAccountAction = null;
let toastTimer;

const productGrid = document.querySelector('#productGrid');
const loadMore = document.querySelector('#loadMore');
const filterBar = document.querySelector('#filterBar');
const cartDrawer = document.querySelector('#cartDrawer');
const wishlistDrawer = document.querySelector('#wishlistDrawer');
const overlay = document.querySelector('#overlay');
const cartItems = document.querySelector('#cartItems');
const wishlistItems = document.querySelector('#wishlistItems');
const cartEmpty = document.querySelector('#cartEmpty');
const wishlistEmpty = document.querySelector('#wishlistEmpty');

const heroSlides = [...document.querySelectorAll('.hero-slide')];
const heroDots = [...document.querySelectorAll('[data-hero-slide]')];
const heroCount = document.querySelector('#heroCount');
const heroPause = document.querySelector('[data-hero-pause]');
const heroSection = document.querySelector('.hero');
const reducedMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const heroInterval = 5000;
let activeHeroSlide = Math.max(0, heroSlides.findIndex((slide) => slide.classList.contains('active')));
let heroTimer;
let heroPausedByUser = false;
let heroPausedByInteraction = false;

function updateHeroSlide(index) {
  activeHeroSlide = (index + heroSlides.length) % heroSlides.length;
  heroSlides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === activeHeroSlide));
  heroDots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === activeHeroSlide;
    dot.classList.toggle('active', isActive);
    if (isActive) dot.setAttribute('aria-current', 'true');
    else dot.removeAttribute('aria-current');
  });
  if (heroCount) heroCount.textContent = `${String(activeHeroSlide + 1).padStart(2, '0')} — ${String(heroSlides.length).padStart(2, '0')}`;
}

function syncHeroAutoplay() {
  clearInterval(heroTimer);
  if (heroSlides.length < 2 || heroPausedByUser || heroPausedByInteraction || document.hidden || reducedMotionPreference.matches) return;
  heroTimer = setInterval(() => updateHeroSlide(activeHeroSlide + 1), heroInterval);
}

if (heroSlides.length) {
  updateHeroSlide(activeHeroSlide);
  document.querySelector('[data-hero-prev]')?.addEventListener('click', () => {
    updateHeroSlide(activeHeroSlide - 1);
    syncHeroAutoplay();
  });
  document.querySelector('[data-hero-next]')?.addEventListener('click', () => {
    updateHeroSlide(activeHeroSlide + 1);
    syncHeroAutoplay();
  });
  heroDots.forEach((dot) => dot.addEventListener('click', () => {
    updateHeroSlide(Number(dot.dataset.heroSlide));
    syncHeroAutoplay();
  }));
  heroPause?.addEventListener('click', () => {
    heroPausedByUser = !heroPausedByUser;
    heroPause.setAttribute('aria-pressed', String(heroPausedByUser));
    heroPause.setAttribute('aria-label', `${heroPausedByUser ? 'Resume' : 'Pause'} automatic slideshow`);
    heroPause.textContent = heroPausedByUser ? '▶' : 'Ⅱ';
    syncHeroAutoplay();
  });
  heroSection?.addEventListener('mouseenter', () => {
    heroPausedByInteraction = true;
    syncHeroAutoplay();
  });
  heroSection?.addEventListener('mouseleave', () => {
    heroPausedByInteraction = false;
    syncHeroAutoplay();
  });
  heroSection?.addEventListener('focusin', () => {
    heroPausedByInteraction = true;
    syncHeroAutoplay();
  });
  heroSection?.addEventListener('focusout', (event) => {
    if (!heroSection.contains(event.relatedTarget)) {
      heroPausedByInteraction = false;
      syncHeroAutoplay();
    }
  });
  document.addEventListener('visibilitychange', syncHeroAutoplay);
  reducedMotionPreference.addEventListener?.('change', syncHeroAutoplay);
  syncHeroAutoplay();
}

const art = {
  royal: `<div class="doll royal"><b class="hair"></b><b class="head"></b><b class="neck"></b><b class="eye left"></b><b class="eye right"></b><b class="body"><i class="stripe"></i><i class="stripe s2"></i></b></div>`,
  peacock: `<div class="doll peacock"><b class="tail"></b><b class="body"></b><b class="hair"></b><b class="head"></b><b class="eye left"></b><b class="eye right"></b></div>`,
  wobble: `<div class="doll wobble"><i class="mini"></i><i class="mini"></i><i class="mini"></i></div>`,
  menagerie: `<div class="doll menagerie"><b class="elephant"></b><b class="horse"></b></div>`,
  story: `<div class="doll story"><b class="hair"></b><b class="head"></b><b class="body"></b></div>`,
  tops: `<div class="doll tops"><i class="top"></i><i class="top"></i><i class="top"></i></div>`
};

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function safeProductImageUrl(value) {
  try {
    if (/^\/(?:uploads\/[a-f0-9]{32}\.(?:jpg|png|webp)|api\/product-images\/[a-f0-9]{24})$/i.test(value)) return value;
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function selectedProducts() {
  const style = document.querySelector('#styleFilter').value;
  const age = document.querySelector('#ageFilter').value;
  const maxPrice = document.querySelector('#priceFilter').value;
  const search = (document.querySelector('#catalogSearch')?.value || '').trim().toLowerCase();
  const matches = products.filter((product) =>
    (activeCollection === 'All collections' || (product.collection || 'Children toys') === activeCollection) &&
    (style === 'All styles' || product.style === style) &&
    (age === 'All ages' || product.ageGroup === age) &&
    (!maxPrice || product.price <= Number(maxPrice)) &&
    (!search || `${product.name} ${product.variant} ${product.style} ${product.ageGroup}`.toLowerCase().includes(search))
  );
  if (sortMode === 'price-low') return [...matches].sort((a, b) => a.price - b.price);
  if (sortMode === 'price-high') return [...matches].sort((a, b) => b.price - a.price);
  if (sortMode === 'name') return [...matches].sort((a, b) => a.name.localeCompare(b.name));
  if (sortMode === 'newest') return [...matches].reverse();
  return matches;
}

function productCard(product) {
  const isSaved = wishlist.has(product.slug);
  const imageUrl = safeProductImageUrl(product.imageUrl) || safeProductImageUrl(product.images?.[0]);
  const available = product.inStock !== false;const hasRating = Number(product.rating) > 0;

  return `<article class="product-card">
    <div class="product-visual product-image-slot">
      <span class="product-image-placeholder" aria-hidden="true">Product photo</span>
      ${imageUrl ? `<img class="product-photo" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy">` : ''}
      ${product.badge || !available ? `<span class="product-tag">${escapeHtml(available ? product.badge : 'Sold out')}</span>` : ''}
      <button class="card-heart ${isSaved ? 'saved' : ''}" data-save="${escapeHtml(product.slug)}" aria-label="${isSaved ? 'Remove from' : 'Save to'} wishlist">${isSaved ? '♥' : '♡'}</button>
      <button class="quick-add" data-add="${escapeHtml(product.slug)}" ${available ? '' : 'disabled'}>${available ? 'Add to bag <span>+</span>' : 'Sold out'}</button>
    </div>
    <div class="product-details">
      <a class="product-name product-detail-trigger" href="/products/${encodeURIComponent(product.slug)}" data-detail="${escapeHtml(product.slug)}">${escapeHtml(product.name)}</a>
      <span class="product-price">${money(product.price)}</span>
      <span class="product-variant">${escapeHtml(product.variant)}</span>
      <span class="product-rating" aria-label="${Number(product.rating || 5).toFixed(1)} out of 5 stars">${Number(product.rating || 5).toFixed(1)} ★ <small>(${Number(product.reviews || 0)})</small></span>
    </div>
  </article>`;
}

function productThumbnail(product) {
  const imageUrl = safeProductImageUrl(product.imageUrl) || safeProductImageUrl(product.images?.[0]);
  const illustration = art[product.imageClass] || `<span class="drawer-photo-fallback">GOMBE</span>`;
  const image = imageUrl
    ? `<img class="drawer-product-photo" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${product.name} - handcrafted Channapatna wooden toy by Gombe`)}" loading="eager">`
    : '';
  return `<div class="drawer-item-art ${escapeHtml(product.imageClass || '')}">${illustration}${image}</div>`;
}

function watchDrawerPhotos(container) {
  container.querySelectorAll('.drawer-product-photo').forEach((image) => {
    image.addEventListener('error', () => image.remove(), { once: true });
  });
}

function renderProducts(reset = false) {
  if (reset) visibleCount = 4;
  const list = selectedProducts();
  productGrid.innerHTML = list.slice(0, visibleCount).map(productCard).join('');
  productGrid.querySelectorAll('.product-photo').forEach((image) => {
    image.addEventListener('error', () => image.remove(), { once: true });
  });
  document.querySelector('#productTotal').textContent = `${String(list.length).padStart(2, '0')} ${list.length === 1 ? 'piece' : 'pieces'} to meet`;
  loadMore.hidden = list.length <= visibleCount;
  document.querySelector('#catalogNoResults').hidden = list.length > 0;
  const filtersUsed = ['#styleFilter', '#ageFilter', '#priceFilter'].filter((selector) => document.querySelector(selector).value && !document.querySelector(selector).value.startsWith('All')).length + (activeCollection === 'All collections' ? 0 : 1);
  document.querySelector('.filter-active-count').textContent = filtersUsed ? `(${filtersUsed})` : '';
  document.querySelectorAll('[data-collection]').forEach((button) => {
    const active = button.dataset.collection === activeCollection;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const chips = [];
  if (activeCollection !== 'All collections') chips.push(['collection', activeCollection]);
  const style = document.querySelector('#styleFilter').value;
  const age = document.querySelector('#ageFilter').value;
  const maxPrice = document.querySelector('#priceFilter').value;
  const search = document.querySelector('#catalogSearch')?.value.trim();
  if (style !== 'All styles') chips.push(['style', style]);
  if (age !== 'All ages') chips.push(['age', age]);
  if (maxPrice) chips.push(['price', `Under ${money(Number(maxPrice))}`]);
  if (search) chips.push(['search', `“${search}”`]);
  const chipRow = document.querySelector('#activeFilterRow');
  const chipList = document.querySelector('#activeFilterChips');
  chipRow.hidden = chips.length === 0;
  chipList.innerHTML = chips.map(([key, value]) => `<button type="button" data-clear-filter="${escapeHtml(key)}">${escapeHtml(value)} <span>×</span></button>`).join('');
}

function renderHighlights(mode = 'featured') {
  const grid = document.querySelector('#highlightGrid');
  if (!grid) return;
  let highlights = [...products];
  if (mode === 'new') highlights = highlights.filter((product) => product.badge === 'New').concat(highlights.filter((product) => product.badge !== 'New')).slice(0, 4);
  if (mode === 'bestsellers') highlights = highlights.filter((product) => product.badge === 'Bestseller' || (Number(product.reviews) >= 65)).slice(0, 4);
  if (mode === 'featured') highlights = highlights.slice(0, 4);
  if (!highlights.length) highlights = products.slice(0, 4);
  grid.innerHTML = highlights.map(productCard).join('');
}

function getProduct(slug) {
  return products.find((product) => product.slug === slug);
}

function cartQuantity() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCounts() {
  document.querySelectorAll('.bag-count').forEach((node) => { node.textContent = cartQuantity(); });
  document.querySelectorAll('.wishlist-count').forEach((node) => { node.textContent = wishlist.size; });
}

function syncCustomerState(data, mergeGuest = false) {
  const guestCart = mergeGuest ? cart : [];
  const guestWishlist = mergeGuest ? [...wishlist] : [];
  customer = data.user;
  const quantities = new Map(data.cart.map((item) => [item.slug, item.quantity]));
  for (const item of guestCart) quantities.set(item.slug, Math.min(99, (quantities.get(item.slug) || 0) + item.quantity));
  cart = [...quantities].map(([slug, quantity]) => {
    const product = getProduct(slug);
    return product ? { ...product, quantity } : null;
  }).filter(Boolean);
  wishlist = new Set([...data.wishlist, ...guestWishlist].filter((slug) => getProduct(slug)));
  updateCounts();
  renderCart();
  renderWishlist();
  renderProducts();
  updateCustomerInterface();
}

function updateCustomerInterface() {
  const accountLabel = document.querySelector('.account-trigger .action-label');
  const accountButton = document.querySelector('.account-trigger');
  const accountMenu = document.querySelector('#accountMenu');
  const accountMenuGreeting = document.querySelector('#accountMenuGreeting');
  document.querySelector('#authForm').hidden = Boolean(customer);
  document.querySelector('.auth-tabs').hidden = Boolean(customer);
  document.querySelector('#authSignedIn').hidden = !customer;
  accountLabel.textContent = customer ? customer.name : 'Log in';
  accountButton.setAttribute('aria-label', customer ? `Account for ${customer.name}` : 'Log in or sign up');
  accountButton.setAttribute('aria-expanded', 'false');
  accountMenu.hidden = true;
  if (customer) {
    document.querySelector('#authSignedInDetails').textContent = customer.email;
    accountMenuGreeting.textContent = customer.name;
  } else {
    accountMenuGreeting.textContent = '';
  }
  document.dispatchEvent(new CustomEvent('gombe:customer-state'));
}

function closeAccountMenu() {
  document.querySelector('#accountMenu').hidden = true;
  document.querySelector('.account-trigger').setAttribute('aria-expanded', 'false');
}

function persistAccountState() {
  if (!customer) return;
  const snapshot = {
    cart: cart.map(({ slug, quantity }) => ({ slug, quantity })),
    wishlist: [...wishlist]
  };
  accountSaveQueue = accountSaveQueue.catch(() => {}).then(async () => {
    const response = await fetch('/api/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to save your bag and wishlist.');
  });
  accountSaveQueue.catch((error) => showToast(error.message));
}

async function loadCustomerSession() {
  try {
    const response = await fetch('/api/auth/session');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to load your account.');
    if (data.authenticated) syncCustomerState(data);
    else updateCustomerInterface();
  } catch (error) {
    console.error('Unable to restore customer session:', error);
    showToast(error.message);
  }
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function addToCart(slug) {
  if (!customer) {
    requestAuthentication(() => addToCart(slug));
    return false;
  }
  const product = getProduct(slug);
  if (!product) return false;
  if (product.inStock === false) {
    showToast(`${product.name} is currently out of stock.`);
    return false;
  }
  const existing = cart.find((item) => item.slug === slug);
  if (existing?.quantity >= 99) {
    showToast(`${product.name} has reached the maximum quantity of 99.`);
    return false;
  }
  if (existing) existing.quantity += 1;
  else cart.push({ ...product, quantity: 1 });
  updateCounts();
  renderCart();
  persistAccountState();
  showToast(`${product.name} is in your bag.`);
  return true;
}

function removeFromCart(slug) {
  cart = cart.filter((item) => item.slug !== slug);
  updateCounts();
  renderCart();
  persistAccountState();
}

function updateCartQuantity(slug, change) {
  const item = cart.find((entry) => entry.slug === slug);
  if (!item) return;
  const quantity = item.quantity + change;
  if (quantity < 1 || quantity > 99) return;
  item.quantity = quantity;
  updateCounts();
  renderCart();
  persistAccountState();
}

function renderCart() {
  cartItems.innerHTML = cart.map((item) => `
    <div class="drawer-item">
      ${productThumbnail(item)}
      <div class="drawer-item-info">
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.variant)}</p>
        <strong>${money(item.price * item.quantity)}</strong>
        <div class="bag-quantity" aria-label="${escapeHtml(item.name)} quantity">
          <button type="button" data-cart-change="-1" data-cart-quantity="${escapeHtml(item.slug)}" aria-label="Decrease ${escapeHtml(item.name)} quantity" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
          <span>Qty ${item.quantity}</span>
          <button type="button" data-cart-change="1" data-cart-quantity="${escapeHtml(item.slug)}" aria-label="Increase ${escapeHtml(item.name)} quantity" ${item.quantity >= 99 ? 'disabled' : ''}>+</button>
        </div>
      </div>
      <button class="remove-item" data-remove-cart="${escapeHtml(item.slug)}" aria-label="Remove ${escapeHtml(item.name)}">×</button>
    </div>
  `).join('');
  watchDrawerPhotos(cartItems);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.querySelector('#cartSubtotal').textContent = money(subtotal);
  document.querySelector('#shippingMessage').textContent = 'Delivery options and any applicable fees are confirmed for your address at checkout.';
  cartEmpty.classList.toggle('visible', cart.length === 0);
  document.querySelector('.cart-summary').style.display = cart.length ? 'block' : 'none';
}

function renderWishlist() {
  const saved = [...wishlist].map(getProduct).filter(Boolean);
  wishlistItems.innerHTML = saved.map((item) => `
    <div class="drawer-item">
      ${productThumbnail(item)}
      <div class="drawer-item-info">
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.variant)} · ${money(item.price)}</p>
        <button class="add-from-wish" data-add="${escapeHtml(item.slug)}">Add to bag</button>
      </div>
      <button class="remove-item" data-remove-wish="${escapeHtml(item.slug)}" aria-label="Remove ${escapeHtml(item.name)}">×</button>
    </div>
  `).join('');
  watchDrawerPhotos(wishlistItems);
  wishlistEmpty.classList.toggle('visible', saved.length === 0);
}

function toggleWishlist(slug) {
  if (!customer) {
    requestAuthentication(() => toggleWishlist(slug));
    return;
  }
  const product = getProduct(slug);
  if (wishlist.has(slug)) {
    wishlist.delete(slug);
    showToast(`${product.name} removed from saved pieces.`);
  } else {
    wishlist.add(slug);
    showToast(`${product.name} saved for later.`);
  }
  updateCounts();
  renderWishlist();
  renderProducts();
  persistAccountState();
}

function openDrawer(drawer) {
  document.querySelectorAll('.cart-drawer,.wishlist-drawer').forEach((element) => element.classList.remove('open'));
  drawer.classList.add('open');
  overlay.classList.add('visible');
  drawer.setAttribute('aria-hidden', 'false');
}

function closeDrawers() {
  document.querySelectorAll('.cart-drawer,.wishlist-drawer').forEach((element) => {
    element.classList.remove('open');
    element.setAttribute('aria-hidden', 'true');
  });
  overlay.classList.remove('visible');
}

productGrid.addEventListener('click', (event) => {
  const addButton = event.target.closest('[data-add]');
  const saveButton = event.target.closest('[data-save]');
  if (addButton) addToCart(addButton.dataset.add);
  if (saveButton) toggleWishlist(saveButton.dataset.save);
});

cartItems.addEventListener('click', (event) => {
  const quantityButton = event.target.closest('[data-cart-change]');
  const removeButton = event.target.closest('[data-remove-cart]');
  if (quantityButton) updateCartQuantity(quantityButton.dataset.cartQuantity, Number(quantityButton.dataset.cartChange));
  if (removeButton) removeFromCart(removeButton.dataset.removeCart);
});

wishlistItems.addEventListener('click', (event) => {
  const remove = event.target.closest('[data-remove-wish]');
  const add = event.target.closest('[data-add]');
  if (remove) toggleWishlist(remove.dataset.removeWish);
  if (add) addToCart(add.dataset.add);
});

document.querySelectorAll('#styleFilter,#ageFilter,#priceFilter').forEach((select) => select.addEventListener('change', () => renderProducts(true)));
document.querySelectorAll('[data-collection]').forEach((button) => button.addEventListener('click', () => {
  activeCollection = button.dataset.collection;
  renderProducts(true);
}));
document.querySelector('#catalogSearch')?.addEventListener('input', () => renderProducts(true));
document.querySelector('#activeFilterChips')?.addEventListener('click', (event) => {
  const key = event.target.closest('[data-clear-filter]')?.dataset.clearFilter;
  if (!key) return;
  if (key === 'collection') activeCollection = 'All collections';
  if (key === 'style') document.querySelector('#styleFilter').value = 'All styles';
  if (key === 'age') document.querySelector('#ageFilter').value = 'All ages';
  if (key === 'price') document.querySelector('#priceFilter').value = '';
  if (key === 'search') document.querySelector('#catalogSearch').value = '';
  renderProducts(true);
});
document.querySelector('#clearFilters')?.addEventListener('click', () => {
  activeCollection = 'All collections';
  document.querySelector('#styleFilter').value = 'All styles';
  document.querySelector('#ageFilter').value = 'All ages';
  document.querySelector('#priceFilter').value = '';
  document.querySelector('#catalogSearch').value = '';
  renderProducts(true);
});
document.querySelectorAll('[data-highlight]').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('[data-highlight]').forEach((button) => {
    const active = button === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  renderHighlights(tab.dataset.highlight);
}));
loadMore.addEventListener('click', () => {
  visibleCount += 4;
  renderProducts();
});
document.querySelector('.filter-toggle').addEventListener('click', () => filterBar.classList.toggle('open'));
document.querySelector('.bag-trigger').addEventListener('click', () => openDrawer(cartDrawer));
document.querySelector('.wishlist-trigger').addEventListener('click', () => openDrawer(wishlistDrawer));
document.querySelectorAll('.drawer-close,.wishlist-close,.close-drawer').forEach((button) => button.addEventListener('click', closeDrawers));
overlay.addEventListener('click', closeDrawers);
document.querySelector('.checkout-button').addEventListener('click', () => {
  if (!cart.length) return showToast('Add a piece to your bag before checking out.');
  closeDrawers();
  document.dispatchEvent(new CustomEvent('gombe:checkout'));
});

const customModal = document.querySelector('#customModal');
const authModal = document.querySelector('#authModal');

function requestAuthentication(action) {
  pendingAccountAction = action;
  document.querySelector('#authMessage').textContent = 'Sign in or create an account to save pieces and add them to your bag.';
  if (!authModal.open) authModal.showModal();
}

authModal.addEventListener('close', () => {
  pendingAccountAction = null;
});

function openCustomModal() {
  document.querySelector('#mobileMenu').classList.remove('open');
  customModal.showModal();
}

document.querySelectorAll('.custom-trigger').forEach((button) => button.addEventListener('click', openCustomModal));
document.querySelector('.account-trigger').addEventListener('click', () => {
  pendingAccountAction = null;
  if (customer) {
    const accountMenu = document.querySelector('#accountMenu');
    const isOpen = !accountMenu.hidden;
    closeAccountMenu();
    if (!isOpen) {
      accountMenu.hidden = false;
      document.querySelector('.account-trigger').setAttribute('aria-expanded', 'true');
    }
    return;
  }
  document.querySelector('#authMessage').textContent = '';
  authModal.showModal();
});
document.querySelector('#accountMenu').addEventListener('click', (event) => {
  const action = event.target.closest('[data-account-action]')?.dataset.accountAction;
  if (!action) return;
  closeAccountMenu();
  if (action === 'profile' || action === 'orders') {
    document.querySelector('#authMessage').textContent = '';
    authModal.showModal();
    document.dispatchEvent(new CustomEvent(action === 'orders' ? 'gombe:open-account-orders' : 'gombe:open-account-profile'));
  } else if (action === 'wishlist') {
    document.querySelector('.wishlist-trigger').click();
  } else if (action === 'bag') {
    document.querySelector('.bag-trigger').click();
  } else if (action === 'logout') {
    document.querySelector('#customerLogout').click();
  }
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.account-menu-wrap')) closeAccountMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeAccountMenu();
});
document.querySelectorAll('.modal-close').forEach((button) => button.addEventListener('click', () => {
  button.closest('dialog')?.close();
  if (button.classList.contains('menu-close')) document.querySelector('#mobileMenu').classList.remove('open');
}));

document.querySelector('#referenceImage').addEventListener('change', (event) => {
  const label = document.querySelector('.upload-area strong');
  if (event.target.files[0]) label.textContent = event.target.files[0].name;
});
document.querySelector('#customForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const file = form.get('referenceImage');
  const payload = Object.fromEntries(form.entries());
  delete payload.referenceImage;
  payload.imageName = file instanceof File ? file.name : '';
  try {
    const response = await fetch('/api/custom-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Unable to submit');
    customModal.close();
    event.currentTarget.reset();
    document.querySelector('.upload-area strong').textContent = 'Share a reference image';
    showToast('Your studio request is with our makers.');
  } catch {
    showToast('Something went wrong. Please try again in a moment.');
  }
});

document.querySelectorAll('[data-auth-tab]').forEach((tab) => tab.addEventListener('click', () => {
  const isSignup = tab.dataset.authTab === 'signup';
  document.querySelectorAll('[data-auth-tab]').forEach((item) => item.classList.toggle('active', item === tab));
  authModal.classList.toggle('signup', isSignup);
  document.querySelector('#authTitle').textContent = isSignup ? 'Make it yours.' : 'Welcome back.';
  document.querySelector('#authSubtext').textContent = isSignup ? 'Create an account to save pieces and follow your orders.' : 'Sign in to see your saved pieces and orders.';
  document.querySelector('.name-field').hidden = !isSignup;
  document.querySelector('.name-field input').required = isSignup;
  document.querySelector('#authForm [name="password"]').autocomplete = isSignup ? 'new-password' : 'current-password';
  document.querySelector('#authForm .forgot').hidden = isSignup;
  document.querySelector('#authMessage').textContent = '';
  document.querySelector('#authForm .button').innerHTML = `${isSignup ? 'Create account' : 'Sign in'} <span>→</span>`;
}));

document.querySelector('#authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const isSignup = document.querySelector('[data-auth-tab="signup"]').classList.contains('active');
  submitButton.disabled = true;
  document.querySelector('#authMessage').textContent = '';
  const guestCart = [...cart];
  const guestWishlist = [...wishlist];
  try {
    const response = await fetch(`/api/auth/${isSignup ? 'signup' : 'login'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to sign in.');
    cart = guestCart;
    wishlist = new Set(guestWishlist);
    syncCustomerState(data, true);
    form.reset();
    const pendingAction = pendingAccountAction;
    pendingAccountAction = null;
    authModal.close();
    pendingAction?.();
    persistAccountState();
    showToast(isSignup ? 'Your Gombe account is ready.' : `Welcome back, ${customer.name}.`);
  } catch (error) {
    document.querySelector('#authMessage').textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector('#customerLogout').addEventListener('click', async () => {
  const button = document.querySelector('#customerLogout');
  button.disabled = true;
  try {
    await accountSaveQueue.catch(() => {});
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to sign out.');
    accountSaveQueue = Promise.resolve();
    customer = null;
    cart = [];
    wishlist = new Set();
    updateCounts();
    renderCart();
    renderWishlist();
    renderProducts();
    updateCustomerInterface();
    authModal.close();
    showToast('You have signed out.');
  } catch (error) {
    document.querySelector('#authMessage').textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#newsletterForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const response = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to sign you up right now.');
    form.reset();
    showToast(data.message);
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#shippingForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const postalCode = document.querySelector('#shippingPostalCode')?.value?.trim();
  const result = document.querySelector('#shippingResult');
  if (!postalCode) {
    result.textContent = 'Please enter a PIN or postal code to estimate delivery.';
    return;
  }
  if (!/^[1-9]\d{5}$/.test(postalCode)) {
    result.textContent = 'Enter a valid 6-digit Indian PIN code. Delivery timing is confirmed at checkout.';
    return;
  }
  result.textContent = 'Typical dispatch is 2–4 business days for ready-to-ship pieces. Delivery timing for your address is confirmed at checkout. Free shipping over ₹2,000.';
});

document.querySelector('[data-open-menu]').addEventListener('click', () => document.querySelector('#mobileMenu').classList.add('open'));
document.querySelectorAll('#mobileMenu nav a').forEach((link) => link.addEventListener('click', () => document.querySelector('#mobileMenu').classList.remove('open')));
document.querySelector('.mobile-bag-trigger')?.addEventListener('click', () => openDrawer(cartDrawer));
document.querySelector('.mobile-account-trigger')?.addEventListener('click', () => document.querySelector('.account-trigger').click());
document.querySelector('#sortSelect')?.addEventListener('change', (event) => {
  sortMode = event.target.value;
  renderProducts(true);
});
window.addEventListener('scroll', () => document.querySelector('#siteHeader').classList.toggle('scrolled', window.scrollY > 80));

async function loadCatalog() {
  try {
    const response = await fetch('/api/products');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        products = data;
      }
    }
  } catch { /* A static preview still works with the curated fallback catalog. */ }
  renderProducts();
  renderHighlights();
}

window.addEventListener('focus', loadCatalog);
updateCounts();
renderCart();
renderWishlist();
updateCustomerInterface();
window.GombeStorefront = {
  getProducts: () => products,
  getCart: () => cart,
  getCustomer: () => customer,
  findProduct: getProduct,
  addToCart,
  renderProducts,
  clearCart: () => {
    cart = [];
    updateCounts();
    renderCart();
    persistAccountState();
  },
  money
};
window.GombeStorefront.catalogReady = loadCatalog();
renderHighlights();
window.GombeStorefront.catalogReady.then(loadCustomerSession);