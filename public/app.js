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
let sortByPrice = false;
let cart = [];
let wishlist = new Set();
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

function money(value) { return `$${Number(value).toFixed(0)}`; }
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
  return products.filter((product) =>
    (style === 'All styles' || product.style === style) &&
    (age === 'All ages' || product.ageGroup === age) &&
    (!maxPrice || product.price <= Number(maxPrice))
  );
}

function productCard(product) {
  const isSaved = wishlist.has(product.slug);
  const imageUrl = safeProductImageUrl(product.imageUrl);
  const imageClass = art[product.imageClass] ? product.imageClass : 'royal';
  return `<article class="product-card">
    <div class="product-visual ${imageClass}${imageUrl ? ' has-photo' : ''}">
      ${imageUrl ? `<img class="product-photo" src="${escapeHtml(imageUrl)}" alt="" loading="lazy">` : ''}
      ${product.badge ? `<span class="product-tag">${escapeHtml(product.badge)}</span>` : ''}
      <button class="card-heart ${isSaved ? 'saved' : ''}" data-save="${escapeHtml(product.slug)}" aria-label="${isSaved ? 'Remove from' : 'Save to'} wishlist">${isSaved ? '♥' : '♡'}</button>
      ${art[imageClass]}
      <button class="quick-add" data-add="${escapeHtml(product.slug)}">Add to bag <span>+</span></button>
    </div>
    <div class="product-details"><span class="product-name">${escapeHtml(product.name)}</span><span class="product-price">${money(product.price)}</span><span class="product-variant">${escapeHtml(product.variant)}</span></div>
  </article>`;
}

function renderProducts(reset = false) {
  if (reset) visibleCount = 4;
  const list = selectedProducts();
  productGrid.innerHTML = list.slice(0, visibleCount).map(productCard).join('');
  document.querySelector('#productTotal').textContent = `${String(list.length).padStart(2, '0')} ${list.length === 1 ? 'piece' : 'pieces'} to meet`;
  loadMore.hidden = list.length <= visibleCount;
  const filtersUsed = ['#styleFilter', '#ageFilter', '#priceFilter'].filter((selector) => document.querySelector(selector).value && !document.querySelector(selector).value.startsWith('All')).length;
  document.querySelector('.filter-active-count').textContent = filtersUsed ? `(${filtersUsed})` : '';
}

function getProduct(slug) { return products.find((product) => product.slug === slug); }
function cartQuantity() { return cart.reduce((sum, item) => sum + item.quantity, 0); }
function updateCounts() {
  document.querySelectorAll('.bag-count').forEach((node) => { node.textContent = cartQuantity(); });
  document.querySelectorAll('.wishlist-count').forEach((node) => { node.textContent = wishlist.size; });
}
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function addToCart(slug) {
  const existing = cart.find((item) => item.slug === slug);
  if (existing) existing.quantity += 1;
  else cart.push({ ...getProduct(slug), quantity: 1 });
  updateCounts();
  renderCart();
  showToast(`${getProduct(slug).name} is in your bag.`);
}
function removeFromCart(slug) {
  cart = cart.filter((item) => item.slug !== slug);
  updateCounts();
  renderCart();
}
function renderCart() {
  cartItems.innerHTML = cart.map((item) => `<div class="drawer-item"><div class="drawer-item-art ${item.imageClass}">${art[item.imageClass]}</div><div class="drawer-item-info"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.variant)} · Qty ${item.quantity}</p><strong>${money(item.price * item.quantity)}</strong></div><button class="remove-item" data-remove-cart="${escapeHtml(item.slug)}" aria-label="Remove ${escapeHtml(item.name)}">×</button></div>`).join('');
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.querySelector('#cartSubtotal').textContent = money(subtotal);
  document.querySelector('#shippingMessage').textContent = subtotal >= 100 ? 'Your order ships anywhere in the world, on us.' : `Add ${money(100 - subtotal)} for complimentary global shipping.`;
  cartEmpty.classList.toggle('visible', cart.length === 0);
  document.querySelector('.cart-summary').style.display = cart.length ? 'block' : 'none';
}
function renderWishlist() {
  const saved = [...wishlist].map(getProduct).filter(Boolean);
  wishlistItems.innerHTML = saved.map((item) => `<div class="drawer-item"><div class="drawer-item-art ${item.imageClass}">${art[item.imageClass]}</div><div class="drawer-item-info"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.variant)} · ${money(item.price)}</p><button class="add-from-wish" data-add="${escapeHtml(item.slug)}">Add to bag</button></div><button class="remove-item" data-remove-wish="${escapeHtml(item.slug)}" aria-label="Remove ${escapeHtml(item.name)}">×</button></div>`).join('');
  wishlistEmpty.classList.toggle('visible', saved.length === 0);
}

function toggleWishlist(slug) {
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
}

function openDrawer(drawer) {
  document.querySelectorAll('.cart-drawer,.wishlist-drawer').forEach((element) => element.classList.remove('open'));
  drawer.classList.add('open');
  overlay.classList.add('visible');
  drawer.setAttribute('aria-hidden', 'false');
}
function closeDrawers() {
  document.querySelectorAll('.cart-drawer,.wishlist-drawer').forEach((element) => { element.classList.remove('open'); element.setAttribute('aria-hidden', 'true'); });
  overlay.classList.remove('visible');
}

productGrid.addEventListener('click', (event) => {
  const addButton = event.target.closest('[data-add]');
  const saveButton = event.target.closest('[data-save]');
  if (addButton) addToCart(addButton.dataset.add);
  if (saveButton) toggleWishlist(saveButton.dataset.save);
});
cartItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-cart]');
  if (button) removeFromCart(button.dataset.removeCart);
});
wishlistItems.addEventListener('click', (event) => {
  const remove = event.target.closest('[data-remove-wish]');
  const add = event.target.closest('[data-add]');
  if (remove) toggleWishlist(remove.dataset.removeWish);
  if (add) addToCart(add.dataset.add);
});

document.querySelectorAll('#styleFilter,#ageFilter,#priceFilter').forEach((select) => select.addEventListener('change', () => renderProducts(true)));
loadMore.addEventListener('click', () => { visibleCount += 4; renderProducts(); });
document.querySelector('.filter-toggle').addEventListener('click', () => filterBar.classList.toggle('open'));
document.querySelector('.bag-trigger').addEventListener('click', () => openDrawer(cartDrawer));
document.querySelector('.wishlist-trigger').addEventListener('click', () => openDrawer(wishlistDrawer));
document.querySelectorAll('.drawer-close,.wishlist-close,.close-drawer').forEach((button) => button.addEventListener('click', closeDrawers));
overlay.addEventListener('click', closeDrawers);
document.querySelector('.checkout-button').addEventListener('click', () => showToast('Checkout is ready for your payment gateway.'));

const customModal = document.querySelector('#customModal');
const authModal = document.querySelector('#authModal');
function openCustomModal() {
  document.querySelector('#mobileMenu').classList.remove('open');
  customModal.showModal();
}
document.querySelectorAll('.custom-trigger').forEach((button) => button.addEventListener('click', openCustomModal));
document.querySelector('.account-trigger').addEventListener('click', () => authModal.showModal());
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
  payload.imageName = file?.name || '';
  try {
    const response = await fetch('/api/custom-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
  document.querySelector('#authForm .button').innerHTML = `${isSignup ? 'Create account' : 'Sign in'} <span>→</span>`;
}));
document.querySelector('#authForm').addEventListener('submit', (event) => { event.preventDefault(); authModal.close(); showToast('You’re all set — welcome to Gombe.'); });
document.querySelector('#newsletterForm').addEventListener('submit', (event) => { event.preventDefault(); event.currentTarget.reset(); showToast('A little joy is on its way to your inbox.'); });

document.querySelector('[data-open-menu]').addEventListener('click', () => document.querySelector('#mobileMenu').classList.add('open'));
document.querySelectorAll('#mobileMenu nav a').forEach((link) => link.addEventListener('click', () => document.querySelector('#mobileMenu').classList.remove('open')));
document.querySelector('#sortButton').addEventListener('click', () => {
  sortByPrice = true;
  products = [...products].sort((a, b) => a.price - b.price);
  document.querySelector('#sortButton').innerHTML = 'Sort: Price low to high <svg><use href="#i-chevron"/></svg>';
  renderProducts(true);
});
window.addEventListener('scroll', () => document.querySelector('#siteHeader').classList.toggle('scrolled', window.scrollY > 80));

async function loadCatalog() {
  try {
    const response = await fetch('/api/products');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        products = sortByPrice ? data.sort((a, b) => a.price - b.price) : data;
      }
    }
  } catch { /* A static preview still works with the curated fallback catalog. */ }
  renderProducts();
}

window.addEventListener('focus', loadCatalog);
updateCounts();
renderCart();
renderWishlist();
loadCatalog();
