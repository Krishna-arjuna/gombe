(() => {
  const store = window.GombeStorefront;
  const formatMoney = store.money;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  const dialogs = document.createElement('div');
  dialogs.innerHTML = `
    <dialog class="feature-dialog product-dialog" id="productDialog" aria-labelledby="productDialogTitle">
      <button class="feature-close" type="button" data-close-dialog aria-label="Close product details">×</button>
      <div class="product-dialog-content"><div class="product-dialog-visual" id="productDialogVisual"></div><div class="product-dialog-copy" id="productDialogCopy"></div></div>
      <section class="product-reviews" id="productReviews"><div class="feature-section-heading"><p class="eyebrow">CUSTOMER NOTES</p><h3>Reviews from the Gombe community</h3></div><div id="reviewList" aria-live="polite"></div><form id="reviewForm" hidden><label>YOUR RATING<select name="rating" required><option value="">Choose a rating</option><option value="5">5 — Loved it</option><option value="4">4 — Lovely</option><option value="3">3 — Good</option><option value="2">2 — Could be better</option><option value="1">1 — Not for me</option></select></label><label>YOUR REVIEW<textarea name="body" maxlength="1200" required placeholder="What should another customer know?"></textarea></label><p class="feature-form-message" id="reviewMessage" role="alert" aria-live="polite"></p><button class="button button-dark" type="submit">Share review <span>→</span></button></form><p id="reviewSignIn" hidden>Sign in to leave a review after your order has been delivered. <button class="inline-action" type="button" data-open-account>Sign in</button></p></section>
    </dialog>
    <dialog class="feature-dialog checkout-dialog" id="checkoutDialog" aria-labelledby="checkoutTitle">
      <button class="feature-close" type="button" data-close-dialog aria-label="Close checkout">×</button>
      <div class="checkout-content"><div class="checkout-heading"><p class="eyebrow">A GOOD THING IS ON ITS WAY</p><h2 id="checkoutTitle">Delivery details</h2><p>Secure checkout · Prices in Indian rupees</p></div>
        <form id="checkoutForm" class="checkout-form">
          <div class="checkout-fields">
            <label>FULL NAME<input name="name" autocomplete="name" maxlength="80" required></label>
            <label>EMAIL ADDRESS<input name="email" type="email" autocomplete="email" maxlength="254" required></label>
            <label>PHONE NUMBER<input name="phone" type="tel" autocomplete="tel" maxlength="30" required></label>
            <label>ADDRESS LINE 1<input name="line1" autocomplete="address-line1" maxlength="160" required></label>
            <label>ADDRESS LINE 2 <span class="optional">OPTIONAL</span><input name="line2" autocomplete="address-line2" maxlength="160"></label>
            <div class="checkout-field-row"><label>CITY<input name="city" autocomplete="address-level2" maxlength="80" required></label><label>STATE / REGION<input name="region" autocomplete="address-level1" maxlength="80" required></label></div>
            <div class="checkout-field-row"><label>POSTAL CODE<input name="postalCode" autocomplete="postal-code" maxlength="20" required></label><label>COUNTRY<select name="country" autocomplete="country" required><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="CA">Canada</option><option value="AU">Australia</option><option value="SG">Singapore</option><option value="AE">United Arab Emirates</option><option value="NZ">New Zealand</option><option value="DE">Germany</option><option value="FR">France</option><option value="JP">Japan</option><option value="IE">Ireland</option><option value="NL">Netherlands</option><option value="IT">Italy</option><option value="ES">Spain</option><option value="CH">Switzerland</option><option value="SE">Sweden</option><option value="NO">Norway</option><option value="DK">Denmark</option><option value="BE">Belgium</option><option value="AT">Austria</option><option value="PT">Portugal</option><option value="KR">South Korea</option><option value="MY">Malaysia</option><option value="TH">Thailand</option><option value="ID">Indonesia</option><option value="PH">Philippines</option><option value="SA">Saudi Arabia</option><option value="QA">Qatar</option><option value="ZA">South Africa</option><option value="BR">Brazil</option><option value="MX">Mexico</option><option value="BD">Bangladesh</option><option value="LK">Sri Lanka</option><option value="NP">Nepal</option></select></label></div>
          </div>
          <fieldset class="gift-options"><legend>MAKE IT A GIFT</legend><label class="gift-check"><input name="giftWrap" type="checkbox"> Add gift wrapping</label><label class="gift-note-field" hidden>PERSONAL NOTE<textarea name="giftMessage" maxlength="500" placeholder="Write a little note to go with your gift"></textarea><small>Up to 500 characters. Please keep personal details out of the gift note.</small></label></fieldset>
          <fieldset class="payment-options"><legend>PAYMENT METHOD</legend><label class="payment-choice" id="razorpayChoice"><input type="radio" name="paymentMethod" value="razorpay"> Pay online with Razorpay <span>Card, UPI and more at secure checkout</span></label><label class="payment-choice" id="codChoice"><input type="radio" name="paymentMethod" value="cod"> Cash on delivery <span>Available for India delivery addresses</span></label><p id="onlinePaymentNotice" class="checkout-note" role="status"></p></fieldset>
          <div class="checkout-total"><span>Items subtotal</span><strong id="checkoutSubtotal"></strong></div><div class="checkout-total"><span>Shipping</span><strong id="checkoutShipping"></strong></div><div class="checkout-total"><span>Gift wrap</span><strong id="checkoutGiftFee"></strong></div><div class="checkout-total checkout-grand-total"><span>Estimated total</span><strong id="checkoutTotal"></strong></div>
          <p class="checkout-note">Shipping fees are included in the total shown above. Delivery timing varies by destination; contact us if you need an estimate before ordering.</p>
          <p class="feature-form-message" id="checkoutMessage" role="alert" aria-live="polite"></p><button class="button button-dark checkout-submit" type="submit">Place order <span>→</span></button>
        </form>
        <section id="checkoutComplete" class="checkout-complete" hidden><p class="eyebrow">ORDER RECEIVED</p><h3>Thank you for choosing Gombe.</h3><p id="checkoutConfirmation"></p><button class="button button-dark" type="button" data-open-tracking>Track this order <span>→</span></button></section>
      </div>
    </dialog>
    <dialog class="feature-dialog tracking-dialog" id="trackingDialog" aria-labelledby="trackingTitle">
      <button class="feature-close" type="button" data-close-dialog aria-label="Close order tracking">×</button>
      <p class="eyebrow">THE JOURNEY HOME</p><h2 id="trackingTitle">Track an order</h2><p>Enter the reference from your order confirmation and the email used at checkout.</p>
      <form id="trackingForm" class="feature-form"><label>ORDER REFERENCE<input name="reference" required maxlength="40" placeholder="GMB-..."></label><label>EMAIL ADDRESS<input name="email" type="email" required maxlength="254" placeholder="you@email.com"></label><p class="feature-form-message" id="trackingMessage" role="alert" aria-live="polite"></p><div id="trackingResult"></div><button class="button button-dark" type="submit">Find my order <span>→</span></button></form>
    </dialog>
    <dialog class="feature-dialog support-dialog" id="supportDialog" aria-labelledby="supportTitle">
      <button class="feature-close" type="button" data-close-dialog aria-label="Close contact form">×</button>
      <p class="eyebrow">HERE TO HELP</p><h2 id="supportTitle">Talk to our team.</h2><p>Send a note and include your order reference if you’re getting in touch about an order.</p>
      <form id="supportForm" class="feature-form"><label>YOUR NAME<input name="name" autocomplete="name" maxlength="80" required></label><label>EMAIL ADDRESS<input name="email" type="email" autocomplete="email" maxlength="254" required></label><label>ORDER REFERENCE <span class="optional">OPTIONAL</span><input name="orderReference" maxlength="40"></label><label>WHAT CAN WE HELP WITH?<select name="topic" required><option>Order help</option><option>Product question</option><option>Gift support</option><option>Returns and exchanges</option><option>Other</option></select></label><label>MESSAGE<textarea name="message" maxlength="2000" required placeholder="Tell us a little about what you need"></textarea></label><p class="feature-form-message" id="supportMessage" role="alert" aria-live="polite"></p><button class="button button-dark" type="submit">Send to customer care <span>→</span></button></form>
    </dialog>`;
  document.body.append(dialogs);

  let checkoutConfig = { razorpayEnabled: false, checkoutReady: false, shippingFee: 0, giftWrapFee: 0 };
  let currentProductSlug = '';
  let currentTrackingCode = '';
  let productDialog = document.querySelector('#productDialog');
  let checkoutDialog = document.querySelector('#checkoutDialog');
  let trackingDialog = document.querySelector('#trackingDialog');
  let supportDialog = document.querySelector('#supportDialog');
  let galleryIndex = 0;

  function showMessage(element, message) {
    element.textContent = message;
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }

  function loadRazorpaySdk() {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => window.Razorpay ? resolve() : reject(new Error('Secure online checkout did not initialize.'));
      script.onerror = () => reject(new Error('Secure online checkout could not load. Try again or choose cash on delivery.'));
      document.head.append(script);
    });
  }

  function openDialog(dialog) {
    document.querySelectorAll('.feature-dialog[open]').forEach((open) => open.close());
    if (!dialog.open) dialog.showModal();
  }

  function restoreCollection() {
    document.body.classList.remove('product-page-mode');
    document.title = 'Gombe — Channapatna, for every story';
    if (window.location.pathname.startsWith('/products/') || new URLSearchParams(window.location.search).has('piece')) {
      history.replaceState({}, '', '/#collection');
    }
    document.querySelector('#collection').scrollIntoView({ behavior: 'smooth' });
  }

  function openTracking(reference = '') {
    currentTrackingCode = reference;
    document.querySelector('#trackingForm').reset();
    document.querySelector('#trackingForm [name="reference"]').value = reference;
    document.querySelector('#trackingMessage').textContent = '';
    document.querySelector('#trackingResult').replaceChildren();
    openDialog(trackingDialog);
  }

  function showOrderConfirmation(order, pendingPayment = false) {
    document.querySelector('#checkoutForm').hidden = true;
    document.querySelector('#checkoutComplete').hidden = false;
    document.querySelector('#checkoutComplete .eyebrow').textContent = pendingPayment ? 'PAYMENT CHECK' : 'ORDER RECEIVED';
    currentTrackingCode = order.trackingCode;
    document.querySelector('#checkoutConfirmation').textContent = pendingPayment
      ? `Your order reference is ${order.trackingCode}. Payment is still being confirmed; check the order status before trying again.`
      : `Your order reference is ${order.trackingCode}. Keep it handy to follow your order.`;
    document.querySelector('#checkoutForm').reset();
    if (!pendingPayment) store.clearCart();
  }

  async function openProduct(slug, updateUrl = true) {
    await store.catalogReady;
    const product = store.findProduct(slug);
    if (!product) return;
    document.title = `${product.name} | Gombe`;
    currentProductSlug = slug;
    const visual = document.querySelector('#productDialogVisual');
    visual.replaceChildren();
    const gallery = [...new Set([product.imageUrl, ...(Array.isArray(product.images) ? product.images : [])]
      .map((value) => {
        if (/^\/uploads\/[a-f0-9]{32}\.(?:jpg|png|webp)$/.test(value)) return value;
        try {
          const parsed = new URL(value);
          return parsed.protocol === 'https:' ? parsed.href : '';
        } catch { return ''; }
      }).filter(Boolean))];
    if (gallery.length) {
      galleryIndex = 0;
      const photo = document.createElement('img');
      photo.className = 'product-dialog-photo';
      photo.alt = product.name;
      photo.loading = 'lazy';
      const stage = document.createElement('div');
      stage.className = 'product-gallery-stage';
      const updatePhoto = () => {
        photo.src = gallery[galleryIndex];
        photo.alt = `${product.name}, image ${galleryIndex + 1} of ${gallery.length}`;
        stage.classList.remove('zoomed');
        const count = stage.querySelector('.gallery-count');
        if (count) count.textContent = `${galleryIndex + 1} / ${gallery.length}`;
        const zoomButton = stage.querySelector('.gallery-zoom');
        if (zoomButton) {
          zoomButton.textContent = 'Zoom image';
          zoomButton.setAttribute('aria-pressed', 'false');
        }
      };
      photo.addEventListener('click', () => stage.classList.toggle('zoomed'));
      photo.onerror = () => {
        photo.alt = 'Product image could not be loaded';
        photo.classList.add('image-unavailable');
      };
      stage.append(photo);
      const zoom = document.createElement('button');
      zoom.type = 'button';
      zoom.className = 'gallery-zoom';
      zoom.textContent = 'Zoom image';
      zoom.setAttribute('aria-pressed', 'false');
      zoom.addEventListener('click', () => {
        const zoomed = stage.classList.toggle('zoomed');
        zoom.setAttribute('aria-pressed', String(zoomed));
        zoom.textContent = zoomed ? 'Reset image' : 'Zoom image';
      });
      stage.append(zoom);
      if (gallery.length > 1) {
        const previous = document.createElement('button');
        previous.type = 'button';
        previous.className = 'gallery-previous';
        previous.setAttribute('aria-label', 'Previous product photo');
        previous.textContent = '←';
        previous.addEventListener('click', () => {
          galleryIndex = (galleryIndex + gallery.length - 1) % gallery.length;
          updatePhoto();
        });
        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'gallery-next';
        next.setAttribute('aria-label', 'Next product photo');
        next.textContent = '→';
        next.addEventListener('click', () => {
          galleryIndex = (galleryIndex + 1) % gallery.length;
          updatePhoto();
        });
        const count = document.createElement('span');
        count.className = 'gallery-count';
        stage.append(previous, next, count);
      }
      visual.append(stage);
      if (gallery.length === 1) stage.querySelector('.gallery-count')?.remove();
      updatePhoto();
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'product-gallery-placeholder';
      placeholder.textContent = 'Product photo';
      visual.append(placeholder);
    }
    const description = product.description || `${product.variant}. A hand-turned wooden piece made for open-ended play, story-making and keeping.`;
    const copy = document.querySelector('#productDialogCopy');
    copy.innerHTML = `
      <a class="product-back-link" href="/#collection">← Back to collection</a>
      <p class="eyebrow">${escapeHtml(product.style)} · ${escapeHtml(product.ageGroup)}</p>
      <h2 id="productDialogTitle">${escapeHtml(product.name)}</h2>
      <p class="product-dialog-price">${formatMoney(product.price)}</p>
      <p class="product-dialog-description">${escapeHtml(description)}</p>
      <dl class="product-facts"><div><dt>Recommended age</dt><dd>${escapeHtml(product.ageGroup)}</dd></div><div><dt>Style</dt><dd>${escapeHtml(product.style)}</dd></div><div><dt>Materials</dt><dd>${escapeHtml(product.materials || 'Contact our team for product-specific details')}</dd></div><div><dt>Dimensions</dt><dd>${escapeHtml(product.dimensions || 'Contact our team for exact dimensions')}</dd></div><div><dt>Care</dt><dd>${escapeHtml(product.care || 'Wipe gently with a soft, dry cloth; keep away from prolonged moisture.')}</dd></div><div><dt>Availability</dt><dd>${product.inStock === false ? 'Currently sold out' : 'Available to order'}</dd></div></dl>
      <p class="checkout-note">For specific safety details, <button type="button" class="inline-action" data-open-support>ask our team</button> before ordering.</p>
      <button type="button" class="button button-dark product-dialog-add" data-add-detail="${escapeHtml(slug)}" ${product.inStock === false ? 'disabled' : ''}>${product.inStock === false ? 'Currently sold out' : 'Add to bag <span>→</span>'}</button>`;
    document.querySelector('#reviewList').innerHTML = '<p class="checkout-note">Loading verified customer reviews…</p>';
    document.querySelector('#reviewForm').hidden = !store.getCustomer();
    document.querySelector('#reviewSignIn').hidden = Boolean(store.getCustomer());
    showMessage(document.querySelector('#reviewMessage'), '');
    openDialog(productDialog);
    if (updateUrl) {
      const url = new URL(`/products/${encodeURIComponent(slug)}`, window.location.origin);
      history.pushState({ piece: slug }, '', url);
    }
    document.body.classList.toggle('product-page-mode', window.location.pathname.startsWith('/products/'));
    try {
      const data = await requestJson(`/api/products/${encodeURIComponent(slug)}/reviews`);
      const reviewList = document.querySelector('#reviewList');
      if (!data.reviews.length) {
        reviewList.innerHTML = '<p class="checkout-note">No verified reviews yet. Be the first to share your experience after your order arrives.</p>';
      } else {
        reviewList.innerHTML = data.reviews.map((review) => `<article class="review-entry"><div><strong>${escapeHtml(review.customerName)}</strong><span class="verified-badge">VERIFIED PURCHASE</span><span class="review-stars" aria-label="${review.rating} out of 5 stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span></div><p>${escapeHtml(review.body)}</p><time datetime="${escapeHtml(review.createdAt)}">${new Date(review.createdAt).toLocaleDateString()}</time></article>`).join('');
      }
    } catch (error) {
      document.querySelector('#reviewList').innerHTML = `<p class="feature-form-message">${escapeHtml(error.message)}</p>`;
    }
  }

  function updateCheckoutTotals() {
    const subtotal = store.getCart().reduce((total, item) => total + item.price * item.quantity, 0);
    const giftWrap = document.querySelector('#checkoutForm [name="giftWrap"]').checked;
    const wrap = giftWrap ? checkoutConfig.giftWrapFee : 0;
    document.querySelector('#checkoutSubtotal').textContent = formatMoney(subtotal);
    document.querySelector('#checkoutShipping').textContent = checkoutConfig.shippingFee ? formatMoney(checkoutConfig.shippingFee) : 'Included';
    document.querySelector('#checkoutGiftFee').textContent = giftWrap ? formatMoney(wrap) : formatMoney(0);
    document.querySelector('#checkoutTotal').textContent = formatMoney(subtotal + checkoutConfig.shippingFee + wrap);
  }

  function syncPaymentChoices() {
    const country = document.querySelector('#checkoutForm [name="country"]').value;
    const onlineRadio = document.querySelector('#checkoutForm [value="razorpay"]');
    const codRadio = document.querySelector('#checkoutForm [value="cod"]');
    const codAvailable = country === 'IN';
    codRadio.disabled = !codAvailable || !checkoutConfig.checkoutReady;
    document.querySelector('#codChoice').classList.toggle('is-disabled', !codAvailable || !checkoutConfig.checkoutReady);
    onlineRadio.disabled = !checkoutConfig.razorpayEnabled || !checkoutConfig.checkoutReady;
    document.querySelector('#razorpayChoice').classList.toggle('is-disabled', !checkoutConfig.razorpayEnabled || !checkoutConfig.checkoutReady);
    const onlineNotice = document.querySelector('#onlinePaymentNotice');
    onlineNotice.textContent = !checkoutConfig.checkoutReady
      ? 'Checkout is being configured. Please try again later.'
      : !checkoutConfig.razorpayEnabled
      ? 'Online payment is being set up. Cash on delivery is available for India orders.'
      : !codAvailable ? 'Cash on delivery is available for India delivery addresses only.' : '';
    if (onlineRadio.disabled && onlineRadio.checked) onlineRadio.checked = false;
    if (codRadio.disabled && codRadio.checked) codRadio.checked = false;
    if (!onlineRadio.disabled && !onlineRadio.checked && !codRadio.checked) onlineRadio.checked = true;
    if (codAvailable && !onlineRadio.disabled && !onlineRadio.checked && !codRadio.checked) onlineRadio.checked = true;
    if (codAvailable && onlineRadio.disabled && !codRadio.checked && !codRadio.disabled) codRadio.checked = true;
  }

  async function beginCheckout() {
    if (!store.getCart().length) return;
    const form = document.querySelector('#checkoutForm');
    form.hidden = false;
    document.querySelector('#checkoutComplete').hidden = true;
    document.querySelector('.gift-note-field').hidden = !document.querySelector('#checkoutForm [name="giftWrap"]').checked;
    showMessage(document.querySelector('#checkoutMessage'), '');
    const customer = store.getCustomer();
    if (customer && !form.elements.email.value) {
      form.elements.name.value = customer.name;
      form.elements.email.value = customer.email;
    }
    updateCheckoutTotals();
    syncPaymentChoices();
    openDialog(checkoutDialog);
  }

  document.querySelector('#productGrid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-detail]');
    if (button) {
      if (button.tagName === 'A') event.preventDefault();
      openProduct(button.dataset.detail);
      return;
    }
    const visual = event.target.closest('.product-visual');
    const cardLink = visual && !event.target.closest('button, a')
      ? visual.closest('.product-card')?.querySelector('[data-detail]')
      : null;
    if (cardLink) openProduct(cardLink.dataset.detail);
  });
  document.querySelector('#productDialogCopy').addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add-detail]');
    if (addButton && !addButton.disabled) {
      store.addToCart(addButton.dataset.addDetail);
      productDialog.close();
      restoreCollection();
      document.querySelector('.bag-trigger').click();
    }
    if (event.target.closest('.product-back-link')) {
      event.preventDefault();
      productDialog.close();
      restoreCollection();
    }
    if (event.target.closest('[data-open-support]')) openDialog(supportDialog);
  });
  document.querySelector('#productDialog').addEventListener('click', (event) => {
    if (event.target.closest('[data-close-dialog]')) {
      productDialog.close();
      restoreCollection();
    }
  });
  document.querySelector('#productDialog').addEventListener('close', restoreCollection);
  document.querySelector('#searchTrigger').addEventListener('click', () => {
    document.querySelector('#collection').scrollIntoView({ behavior: 'smooth' });
    window.setTimeout(() => document.querySelector('#catalogSearch').focus(), 350);
  });
  document.querySelector('#catalogSearch').addEventListener('input', () => store.renderProducts(true));

  document.querySelector('#checkoutForm [name="giftWrap"]').addEventListener('change', (event) => {
    document.querySelector('.gift-note-field').hidden = !event.target.checked;
    updateCheckoutTotals();
  });
  document.querySelector('#checkoutForm [name="country"]').addEventListener('change', syncPaymentChoices);
  document.addEventListener('gombe:checkout', beginCheckout);
  document.querySelector('#checkoutDialog').addEventListener('click', (event) => {
    if (event.target.closest('[data-close-dialog]')) checkoutDialog.close();
  });
  document.querySelector('#checkoutForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('.checkout-submit');
    const fields = new FormData(form);
    const paymentMethod = fields.get('paymentMethod');
    if (!paymentMethod) return showMessage(document.querySelector('#checkoutMessage'), 'Choose a payment method to continue.');
    button.disabled = true;
    showMessage(document.querySelector('#checkoutMessage'), '');
    try {
      if (paymentMethod === 'razorpay') await loadRazorpaySdk();
      const data = await requestJson('/api/checkout/create', {
        method: 'POST',
        body: JSON.stringify({
          name: fields.get('name'),
          email: fields.get('email'),
          phone: fields.get('phone'),
          address: {
            line1: fields.get('line1'),
            line2: fields.get('line2'),
            city: fields.get('city'),
            region: fields.get('region'),
            postalCode: fields.get('postalCode'),
            country: fields.get('country')
          },
          items: store.getCart().map(({ slug, quantity }) => ({ slug, quantity })),
          paymentMethod,
          giftWrap: fields.get('giftWrap') === 'on',
          giftMessage: fields.get('giftMessage')
        })
      });
      if (paymentMethod === 'cod') {
        showOrderConfirmation(data.order);
        return;
      }
      const razorpay = new window.Razorpay({
        key: data.razorpay.keyId,
        order_id: data.razorpay.orderId,
        amount: data.razorpay.amount,
        currency: data.razorpay.currency,
        name: 'Gombe',
        description: `Order ${data.order.trackingCode}`,
        prefill: { name: fields.get('name'), email: fields.get('email'), contact: fields.get('phone') },
        notes: { trackingCode: data.order.trackingCode },
        theme: { color: '#315945' },
        handler: async (response) => {
          button.disabled = true;
          try {
            const verified = await requestJson('/api/checkout/verify', {
              method: 'POST',
              body: JSON.stringify({
                trackingCode: data.order.trackingCode,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });
            showOrderConfirmation(verified.order);
          } catch (error) {
            showOrderConfirmation(data.order, true);
            showMessage(document.querySelector('#checkoutMessage'), error.message);
          } finally {
            button.disabled = false;
          }
        },
        modal: { ondismiss: () => { button.disabled = false; } }
      });
      razorpay.on('payment.failed', (response) => showMessage(document.querySelector('#checkoutMessage'), response.error?.description || 'Payment did not complete. Your bag is still saved.'));
      razorpay.open();
    } catch (error) {
      showMessage(document.querySelector('#checkoutMessage'), error.message);
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector('#trackingForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = document.querySelector('#trackingMessage');
    const result = document.querySelector('#trackingResult');
    showMessage(message, '');
    result.replaceChildren();
    try {
      const params = new URLSearchParams({ reference: form.get('reference'), email: form.get('email') });
      const data = await requestJson(`/api/orders/track?${params}`);
      const order = data.order;
      result.innerHTML = `<article class="tracking-result"><p class="eyebrow">ORDER ${escapeHtml(order.trackingCode)}</p><h3>${escapeHtml(order.status.replace(/_/g, ' '))}</h3><p>${order.items.map((item) => `${escapeHtml(item.name)} × ${item.quantity}`).join(' · ')}</p><p>${formatMoney(order.total)} · ${escapeHtml(order.paymentMethod.toUpperCase())} · Payment ${escapeHtml(order.paymentStatus.replace(/_/g, ' '))}</p><time>${new Date(order.createdAt).toLocaleDateString()}</time></article>`;
    } catch (error) {
      showMessage(message, error.message);
    }
  });

  document.querySelector('#supportForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    showMessage(document.querySelector('#supportMessage'), '');
    try {
      const response = await requestJson('/api/support-requests', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      form.reset();
      showMessage(document.querySelector('#supportMessage'), response.message);
    } catch (error) {
      showMessage(document.querySelector('#supportMessage'), error.message);
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector('#reviewForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    showMessage(document.querySelector('#reviewMessage'), '');
    try {
      await requestJson(`/api/products/${encodeURIComponent(currentProductSlug)}/reviews`, {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      form.reset();
      form.hidden = true;
      showMessage(document.querySelector('#reviewMessage'), 'Thank you. Your verified review is now part of the community notes.');
      const data = await requestJson(`/api/products/${encodeURIComponent(currentProductSlug)}/reviews`);
      document.querySelector('#reviewList').innerHTML = data.reviews.map((review) => `<article class="review-entry"><div><strong>${escapeHtml(review.customerName)}</strong><span class="verified-badge">VERIFIED PURCHASE</span><span class="review-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span></div><p>${escapeHtml(review.body)}</p><time>${new Date(review.createdAt).toLocaleDateString()}</time></article>`).join('');
    } catch (error) {
      showMessage(document.querySelector('#reviewMessage'), error.message);
    } finally {
      button.disabled = false;
    }
  });

  const communityReviews = document.querySelector('#communityReviews');
  communityReviews.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-review-product]');
    if (trigger) openProduct(trigger.dataset.reviewProduct);
  });
  requestJson('/api/reviews/recent').then(({ reviews }) => {
    if (!reviews.length) return;
    communityReviews.innerHTML = reviews.map((review, index) => {
      const initials = review.customerName.slice(0, 2).toUpperCase();
      const avatar = ['avatar-coral', 'avatar-blue', 'avatar-green', 'avatar-gold'][index % 4];
      return `<article class="blogger-card"><div class="blogger-top"><span class="blogger-avatar ${avatar}">${escapeHtml(initials)}</span><div><strong>${escapeHtml(review.customerName)}</strong><small>Verified Gombe customer</small></div><span class="blogger-stars" aria-label="${review.rating} out of 5 stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span></div><blockquote>${escapeHtml(review.body)}</blockquote><button class="community-review-link" type="button" data-review-product="${escapeHtml(review.productSlug)}">${escapeHtml(review.productName)} · Read piece <span>↗</span></button></article>`;
    }).join('');
  }).catch(() => {
    communityReviews.innerHTML = '<p class="community-review-empty">Verified reviews will appear here once the customer database is connected.</p>';
  });

  document.querySelectorAll('[data-open-tracking]').forEach((button) => button.addEventListener('click', () => openTracking(currentTrackingCode)));
  document.querySelectorAll('[data-open-support]').forEach((button) => button.addEventListener('click', () => openDialog(supportDialog)));
  document.querySelector('.gift-support-trigger').addEventListener('click', () => {
    document.querySelector('#supportForm [name="topic"]').value = 'Gift support';
  });
  document.querySelectorAll('.feature-dialog [data-close-dialog]').forEach((button) => button.addEventListener('click', () => {
    const dialog = button.closest('dialog');
    dialog.close();
    if (dialog === productDialog) restoreCollection();
  }));
  async function loadAccountOrders() {
    if (!store.getCustomer()) return;
    const signedIn = document.querySelector('#authSignedIn');
    let orderArea = document.querySelector('#accountOrders');
    if (!orderArea) {
      orderArea = document.createElement('section');
      orderArea.id = 'accountOrders';
      orderArea.className = 'account-orders';
      signedIn.insertBefore(orderArea, document.querySelector('#customerLogout'));
    }
    orderArea.innerHTML = '<p class="eyebrow">YOUR ORDERS</p><p>Loading your orders…</p>';
    try {
      const data = await requestJson('/api/account/orders');
      orderArea.innerHTML = `<p class="eyebrow">YOUR ORDERS</p>${data.orders.length ? data.orders.map((order) => `<article><strong>${escapeHtml(order.trackingCode)}</strong><span>${escapeHtml(order.status.replace(/_/g, ' '))} · ${formatMoney(order.total)}</span><button type="button" data-track-account="${escapeHtml(order.trackingCode)}">Track</button></article>`).join('') : '<p>Your placed orders will appear here.</p>'}`;
      orderArea.querySelectorAll('[data-track-account]').forEach((button) => button.addEventListener('click', () => openTracking(button.dataset.trackAccount)));
    } catch (error) {
      orderArea.innerHTML = `<p class="feature-form-message">${escapeHtml(error.message)}</p>`;
    }
  }
  document.querySelector('.account-trigger').addEventListener('click', loadAccountOrders);
  document.addEventListener('gombe:customer-state', loadAccountOrders);
  document.querySelector('#reviewSignIn').addEventListener('click', (event) => {
    if (event.target.closest('[data-open-account]')) {
      productDialog.close();
      restoreCollection();
      document.querySelector('.account-trigger').click();
    }
  });

  document.querySelector('#checkoutForm').elements.country.value = 'IN';
  requestJson('/api/checkout/config').then((data) => {
    checkoutConfig = data;
    syncPaymentChoices();
  }).catch((error) => {
    document.querySelector('#onlinePaymentNotice').textContent = error.message;
  });

  document.querySelector('#catalogSearch').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.currentTarget.value = '';
      store.renderProducts(true);
      event.currentTarget.blur();
    }
  });
  const productPageMatch = window.location.pathname.match(/^\/products\/([^/]+)\/?$/);
  const sharedProduct = productPageMatch
    ? decodeURIComponent(productPageMatch[1])
    : new URLSearchParams(window.location.search).get('piece');
  if (productPageMatch) document.body.classList.add('product-page-mode');
  if (sharedProduct) openProduct(sharedProduct, false);
  window.addEventListener('popstate', () => {
    const slug = new URLSearchParams(window.location.search).get('piece');
    if (slug) openProduct(slug, false);
    else if (productDialog.open) productDialog.close();
  });
})();
