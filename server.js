import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import { mkdir, writeFile } from 'fs/promises';
import mongoose from 'mongoose';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const scrypt = promisify(crypto.scrypt);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;
const adminCookieName = 'gombe_admin';
const adminSessionDuration = 8 * 60 * 60;
const customerCookieName = 'gombe_customer';
const customerSessionDuration = 30 * 24 * 60 * 60;
const loginAttempts = new Map();
const customerAuthAttempts = new Map();

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const productSchema = new mongoose.Schema({
  name: String,
  slug: { type: String, unique: true },
  price: Number,
  style: String,
  ageGroup: String,
  color: String,
  variant: String,
  badge: String,
  imageClass: String,
  imageUrl: String,
  images: [{ type: String, maxlength: 2048 }],
  description: { type: String, maxlength: 1200, default: '' },
  materials: { type: String, maxlength: 160, default: '' },
  dimensions: { type: String, maxlength: 80, default: '' },
  care: { type: String, maxlength: 500, default: '' },
  rating: Number,
  reviews: Number,
  inStock: { type: Boolean, default: true }
}, { timestamps: true });

const customRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  style: String,
  size: String,
  note: { type: String, maxlength: 1200 },
  imageName: String,
  status: { type: String, default: 'new' }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  trackingCode: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  address: {
    line1: { type: String, required: true, maxlength: 160 },
    line2: { type: String, maxlength: 160 },
    city: { type: String, required: true, maxlength: 80 },
    region: { type: String, required: true, maxlength: 80 },
    postalCode: { type: String, required: true, maxlength: 20 },
    country: { type: String, required: true, maxlength: 2 }
  },
  items: [{
    _id: false,
    slug: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    unitPrice: { type: Number, required: true, min: 1 }
  }],
  currency: { type: String, default: 'INR' },
  subtotal: { type: Number, required: true },
  shippingFee: { type: Number, required: true, default: 0 },
  giftWrapFee: { type: Number, required: true, default: 0 },
  giftWrap: { type: Boolean, default: false },
  total: { type: Number, required: true },
  giftMessage: { type: String, maxlength: 500, default: '' },
  paymentMethod: { type: String, enum: ['razorpay', 'cod'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'cod_due'], required: true },
  status: { type: String, enum: ['awaiting_payment', 'placed', 'processing', 'shipped', 'delivered', 'cancelled'], required: true },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' }
}, { timestamps: true });

const productReviewSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  productSlug: { type: String, required: true },
  customerName: { type: String, required: true, maxlength: 80 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  body: { type: String, required: true, maxlength: 1200 }
}, { timestamps: true });
productReviewSchema.index({ customerId: 1, productSlug: 1 }, { unique: true });

const supportRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  orderReference: { type: String, trim: true, maxlength: 40 },
  topic: { type: String, required: true, maxlength: 40 },
  message: { type: String, required: true, maxlength: 2000 }
}, { timestamps: true });

const newsletterSubscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 }
}, { timestamps: true });

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordSalt: { type: String, required: true },
  passwordHash: { type: String, required: true },
  cart: [{
    _id: false,
    slug: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 99 }
  }],
  wishlist: [{ type: String }]
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
const CustomRequest = mongoose.model('CustomRequest', customRequestSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Order = mongoose.model('Order', orderSchema);
const ProductReview = mongoose.model('ProductReview', productReviewSchema);
const SupportRequest = mongoose.model('SupportRequest', supportRequestSchema);
const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);

const catalog = [
  { name: 'Rani & Raja', slug: 'rani-raja', price: 68, style: 'Classic', ageGroup: '3+ years', color: 'red', variant: 'Set of 2', badge: 'Bestseller', imageClass: 'royal', rating: 4.9, reviews: 132 },
  { name: 'Dancing Peacock', slug: 'dancing-peacock', price: 42, style: 'Animal friends', ageGroup: '3+ years', color: 'blue', variant: 'Hand carved', badge: 'New', imageClass: 'peacock', rating: 4.8, reviews: 76 },
  { name: 'Wobble Family', slug: 'wobble-family', price: 58, style: 'Playful', ageGroup: '1+ years', color: 'yellow', variant: 'Set of 3', badge: '', imageClass: 'wobble', rating: 5, reviews: 48 },
  { name: 'The Little Menagerie', slug: 'little-menagerie', price: 76, style: 'Animal friends', ageGroup: '3+ years', color: 'green', variant: 'Set of 5', badge: 'Gift ready', imageClass: 'menagerie', rating: 4.9, reviews: 91 },
  { name: 'Storyteller Set', slug: 'storyteller-set', price: 84, style: 'Classic', ageGroup: '6+ years', color: 'red', variant: 'Set of 4', badge: '', imageClass: 'story', rating: 4.8, reviews: 42 },
  { name: 'Tiny Top Trio', slug: 'tiny-top-trio', price: 36, style: 'Playful', ageGroup: '1+ years', color: 'yellow', variant: 'Set of 3', badge: 'Small joy', imageClass: 'tops', rating: 4.9, reviews: 65 }
];

function adminIsConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET?.length >= 32);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signAdminSession(expiresAt) {
  return crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(String(expiresAt)).digest('hex');
}

function hasValidAdminSession(req) {
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${adminCookieName}=`));
  if (!cookie) return false;
  const token = cookie.slice(adminCookieName.length + 1);
  const separator = token.indexOf('.');
  if (separator < 1) return false;
  const expiresAt = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(signature, signAdminSession(expiresAt));
}

function requireAdmin(req, res, next) {
  if (!adminIsConfigured()) return res.status(503).json({ error: 'Admin access is not configured on this server.' });
  if (!hasValidAdminSession(req)) return res.status(401).json({ error: 'Please sign in to manage products.' });
  next();
}

function requireSameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (!origin) return res.status(403).json({ error: 'This request must come from the admin website.' });
  try {
    if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
  } catch {
    return res.status(403).json({ error: 'Invalid request origin.' });
  }
  next();
}

function customerSessionSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  return typeof secret === 'string' && secret.length >= 32 ? secret : null;
}

function signCustomerSession(userId, expiresAt, secret) {
  return crypto.createHmac('sha256', secret).update(`${userId}.${expiresAt}`).digest('hex');
}

function customerSessionToken(req) {
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${customerCookieName}=`));
  if (!cookie) return null;
  const token = cookie.slice(customerCookieName.length + 1);
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiresAt, signature] = parts;
  if (!mongoose.isValidObjectId(userId) || !/^\d+$/.test(expiresAt) ||
      Number(expiresAt) <= Math.floor(Date.now() / 1000)) return null;
  const secret = customerSessionSecret();
  if (!secret || !safeEqual(signature, signCustomerSession(userId, expiresAt, secret))) return null;
  return userId;
}

function setCustomerCookie(res, userId) {
  const secret = customerSessionSecret();
  if (!secret) throw new Error('Customer account sessions are not configured.');
  const expiresAt = Math.floor(Date.now() / 1000) + customerSessionDuration;
  const signature = signCustomerSession(userId, expiresAt, secret);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${customerCookieName}=${userId}.${expiresAt}.${signature}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${customerSessionDuration}${secure}`);
}

function requireCustomer(req, res, next) {
  if (!databaseReady) return res.status(503).json({ error: 'Customer accounts are unavailable until MongoDB is connected.' });
  const userId = customerSessionToken(req);
  if (!userId) return res.status(401).json({ error: 'Please sign in to access your account.' });
  Customer.findById(userId)
    .then((customer) => {
      if (!customer) return res.status(401).json({ error: 'Please sign in to access your account.' });
      req.customer = customer;
      next();
    })
    .catch((error) => {
      console.error('Unable to verify customer session:', error);
      res.status(500).json({ error: 'Unable to verify your account right now.' });
    });
}

function checkCustomerAuthRateLimit(req, res) {
  const key = req.ip;
  const attempt = customerAuthAttempts.get(key);
  const now = Date.now();
  if (attempt?.blockedUntil > now) {
    res.status(429).json({ error: 'Too many account attempts. Please try again in 15 minutes.' });
    return false;
  }
  return true;
}

function recordCustomerAuthFailure(req) {
  const previous = customerAuthAttempts.get(req.ip);
  const failures = previous?.blockedUntil && previous.blockedUntil <= Date.now() ? 0 : (previous?.failures || 0);
  const nextFailures = failures + 1;
  customerAuthAttempts.set(req.ip, {
    failures: nextFailures,
    blockedUntil: nextFailures >= 5 ? Date.now() + 15 * 60 * 1000 : 0
  });
}

function customerAccountData(customer) {
  return {
    user: { name: customer.name, email: customer.email },
    cart: customer.cart.map(({ slug, quantity }) => ({ slug, quantity })),
    wishlist: customer.wishlist
  };
}

function validateProduct(body) {
  const allowedStyles = ['Classic', 'Animal friends', 'Playful'];
  const allowedAgeGroups = ['1+ years', '3+ years', '6+ years'];
  const allowedImages = ['royal', 'peacock', 'wobble', 'menagerie', 'story', 'tops'];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const variant = typeof body.variant === 'string' ? body.variant.trim() : '';
  const style = body.style;
  const ageGroup = body.ageGroup;
  const imageClass = body.imageClass;
  const badge = typeof body.badge === 'string' ? body.badge.trim() : '';
  const price = Number(body.price);
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const materials = typeof body.materials === 'string' ? body.materials.trim() : '';
  const dimensions = typeof body.dimensions === 'string' ? body.dimensions.trim() : '';
  const care = typeof body.care === 'string' ? body.care.trim() : '';
  const inStock = body.inStock === false || body.inStock === 'false' ? false : true;
  const images = typeof body.images === 'string'
    ? body.images.split(/\r?\n/).map((url) => url.trim()).filter(Boolean)
    : Array.isArray(body.images) ? body.images : [];
  const isAllowedImageUrl = (value) => {
    if (/^\/uploads\/[a-f0-9]{32}\.(?:jpg|png|webp)$/.test(value)) return true;
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  };

  if (!name || name.length > 80) return { error: 'Name is required and must be 80 characters or fewer.' };
  if (!Number.isInteger(price) || price <= 0 || price > 10000000) return { error: 'Enter a whole-rupee price greater than ₹0 and no more than ₹1,00,00,000.' };
  if (!variant || variant.length > 80) return { error: 'Description is required and must be 80 characters or fewer.' };
  if (description.length > 1200 || materials.length > 160 || dimensions.length > 80 || care.length > 500) return { error: 'Product details exceed their allowed length.' };
  if (!allowedStyles.includes(style)) return { error: 'Choose a valid toy style.' };
  if (!allowedAgeGroups.includes(ageGroup)) return { error: 'Choose a valid recommended age.' };
  if (!allowedImages.includes(imageClass)) return { error: 'Choose a valid illustration style.' };
  if (badge.length > 30) return { error: 'Badge must be 30 characters or fewer.' };
  if (imageUrl) {
    if (!isAllowedImageUrl(imageUrl)) return { error: 'Use an uploaded product image or a valid HTTPS image link.' };
    if (imageUrl.length > 2048) return { error: 'Image link must be 2,048 characters or fewer.' };
  }
  if (images.length > 5 || images.some((url) => typeof url !== 'string' || url.length > 2048)) {
    return { error: 'Add up to five additional image links, each no longer than 2,048 characters.' };
  }
  for (const url of images) {
    if (!isAllowedImageUrl(url)) return { error: 'Use uploaded gallery images or valid HTTPS image links.' };
  }

  return {
    product: {
      name,
      price,
      style,
      ageGroup,
      variant,
      badge,
      imageClass,
      imageUrl,
      images,
      description,
      materials,
      dimensions,
      care,
      color: { royal: 'red', peacock: 'blue', wobble: 'yellow', menagerie: 'green', story: 'red', tops: 'yellow' }[imageClass],
      rating: 5,
      reviews: 0,
      inStock
    }
  };
}

let databaseReady = false;
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      databaseReady = true;
      if (await Product.countDocuments() === 0) await Product.insertMany(catalog);
      console.log('Connected to MongoDB');
    })
    .catch((error) => console.warn(`MongoDB unavailable; serving demo catalog. ${error.message}`));
} else {
  console.warn('MONGODB_URI is not set; serving demo catalog. Add it in .env to persist products and requests.');
}

function filterCatalog(items, query) {
  const { style, age, maxPrice } = query;
  return items.filter((item) =>
    (!style || style === 'All styles' || item.style === style) &&
    (!age || age === 'All ages' || item.ageGroup === age) &&
    (!maxPrice || item.price <= Number(maxPrice))
  );
}

function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

async function razorpayApi(pathname, method, body) {
  const response = await fetch(`https://api.razorpay.com/v1${pathname}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Razorpay API request failed:', response.status, result.error?.code || 'unknown error');
    throw new Error('Online payment could not be started or verified. Please try again or choose cash on delivery.');
  }
  return result;
}

function orderForCustomer(order) {
  return {
    trackingCode: order.trackingCode,
    items: order.items.map(({ name, quantity }) => ({ name, quantity })),
    total: order.total,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    createdAt: order.createdAt
  };
}

app.get('/api/products', async (req, res) => {
  try {
    const items = databaseReady ? await Product.find().sort({ createdAt: -1 }).lean() : catalog;
    res.json(filterCatalog(items, req.query));
  } catch (error) {
    res.status(500).json({ error: 'Unable to load the collection.' });
  }
});

app.get('/api/checkout/config', (_req, res) => {
  const shippingFee = Number(process.env.SHIPPING_FEE_INR || 0);
  const giftWrapFee = Number(process.env.GIFT_WRAP_FEE_INR || 0);
  const feesValid = [shippingFee, giftWrapFee].every((fee) => Number.isSafeInteger(fee) && fee >= 0);
  res.json({
    razorpayEnabled: razorpayConfigured(),
    razorpayKeyId: razorpayConfigured() ? process.env.RAZORPAY_KEY_ID : '',
    checkoutReady: feesValid,
    shippingFee: feesValid ? shippingFee : 0,
    giftWrapFee: feesValid ? giftWrapFee : 0
  });
});

app.post('/api/checkout/create', requireSameOrigin, async (req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Checkout is unavailable until the product database is connected.' });
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const address = body.address || {};
  const country = typeof address.country === 'string' ? address.country.trim().toUpperCase() : '';
  const paymentMethod = body.paymentMethod;
  const giftMessage = typeof body.giftMessage === 'string' ? body.giftMessage.trim() : '';
  const lines = body.items;
  if (!name || name.length > 80) return res.status(400).json({ error: 'Enter your name (80 characters or fewer).' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!phone || phone.length > 30) return res.status(400).json({ error: 'Enter a valid phone number.' });
  if (!['razorpay', 'cod'].includes(paymentMethod)) return res.status(400).json({ error: 'Choose an available payment method.' });
  if (paymentMethod === 'cod' && country !== 'IN') return res.status(400).json({ error: 'Cash on delivery is currently available for India delivery addresses only.' });
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 50) return res.status(400).json({ error: 'Your bag is empty or contains too many products.' });
  if (giftMessage.length > 500) return res.status(400).json({ error: 'Gift notes must be 500 characters or fewer.' });
  const addressFields = {
    line1: typeof address.line1 === 'string' ? address.line1.trim() : '',
    line2: typeof address.line2 === 'string' ? address.line2.trim() : '',
    city: typeof address.city === 'string' ? address.city.trim() : '',
    region: typeof address.region === 'string' ? address.region.trim() : '',
    postalCode: typeof address.postalCode === 'string' ? address.postalCode.trim() : '',
    country
  };
  if (!addressFields.line1 || addressFields.line1.length > 160 ||
      addressFields.line2.length > 160 || !addressFields.city || addressFields.city.length > 80 ||
      !addressFields.region || addressFields.region.length > 80 ||
      !addressFields.postalCode || addressFields.postalCode.length > 20 ||
      !/^[A-Z]{2}$/.test(country)) {
    return res.status(400).json({ error: 'Complete each required delivery address field.' });
  }
  const quantities = new Map();
  for (const item of lines) {
    const slug = typeof item?.slug === 'string' ? item.slug : '';
    const quantity = Number(item?.quantity);
    if (!slug || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ error: 'Your bag contains an invalid product or quantity.' });
    }
    quantities.set(slug, Math.min(99, (quantities.get(slug) || 0) + quantity));
  }
  try {
    const foundProducts = await Product.find({ slug: { $in: [...quantities.keys()] } }).lean();
    const bySlug = new Map(foundProducts.map((product) => [product.slug, product]));
    if (bySlug.size !== quantities.size) return res.status(400).json({ error: 'A product in your bag is no longer available. Refresh the collection and try again.' });
    const items = [...quantities].map(([slug, quantity]) => {
      const product = bySlug.get(slug);
      if (!product.inStock) throw new Error(`${product.name} is currently out of stock.`);
      return { slug, name: product.name, quantity, unitPrice: product.price };
    });
    const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    const shippingFee = Number(process.env.SHIPPING_FEE_INR || 0);
    const giftWrapFee = body.giftWrap === true ? Number(process.env.GIFT_WRAP_FEE_INR || 0) : 0;
    if (![shippingFee, giftWrapFee].every((fee) => Number.isSafeInteger(fee) && fee >= 0)) {
      console.error('Invalid shipping or gift-wrap fee configuration.');
      return res.status(503).json({ error: 'Checkout fees are not configured correctly. Please contact the shop.' });
    }
    const total = subtotal + shippingFee + giftWrapFee;
    if (!Number.isSafeInteger(total) || total <= 0 || total > 1000000) {
      return res.status(400).json({ error: 'The order total is outside the supported payment range.' });
    }
    if (paymentMethod === 'razorpay' && !razorpayConfigured()) {
      return res.status(503).json({ error: 'Online payments are not configured yet. Choose cash on delivery or contact the shop.' });
    }
    const trackingCode = `GMB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    let providerOrder = null;
    if (paymentMethod === 'razorpay') {
      providerOrder = await razorpayApi('/orders', 'POST', {
        amount: total * 100,
        currency: 'INR',
        receipt: trackingCode.replace(/-/g, '').slice(0, 40),
        notes: { trackingCode }
      });
    }
    const userId = customerSessionToken(req);
    const order = await Order.create({
      trackingCode,
      customerId: userId,
      customerName: name,
      email,
      phone,
      address: addressFields,
      items,
      subtotal,
      shippingFee,
      giftWrapFee,
      giftWrap: body.giftWrap === true,
      total,
      giftMessage: body.giftWrap === true ? giftMessage : '',
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'cod_due' : 'pending',
      status: paymentMethod === 'cod' ? 'placed' : 'awaiting_payment',
      razorpayOrderId: providerOrder?.id || ''
    });
    res.status(201).json({
      order: orderForCustomer(order),
      ...(providerOrder ? {
        razorpay: {
          keyId: process.env.RAZORPAY_KEY_ID,
          orderId: providerOrder.id,
          amount: providerOrder.amount,
          currency: providerOrder.currency
        }
      } : {})
    });
  } catch (error) {
    if (error.message?.includes('out of stock')) return res.status(409).json({ error: error.message });
    console.error('Unable to create checkout order:', error);
    res.status(error.message?.includes('Online payment') ? 502 : 500).json({
      error: error.message?.includes('Online payment') ? error.message : 'Unable to place your order right now. Please try again.'
    });
  }
});

app.post('/api/checkout/verify', requireSameOrigin, async (req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Order verification is unavailable until the database is connected.' });
  if (!razorpayConfigured()) return res.status(503).json({ error: 'Online payments are not configured on this server.' });
  const { trackingCode, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
  if (![trackingCode, razorpayOrderId, razorpayPaymentId, razorpaySignature].every((value) => typeof value === 'string' && value.length <= 200)) {
    return res.status(400).json({ error: 'Payment verification details are incomplete.' });
  }
  try {
    const order = await Order.findOne({ trackingCode, paymentMethod: 'razorpay' });
    if (!order || order.razorpayOrderId !== razorpayOrderId) return res.status(404).json({ error: 'The order for this payment could not be found.' });
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${order.razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
    if (!safeEqual(expectedSignature, razorpaySignature)) return res.status(400).json({ error: 'The payment signature could not be verified.' });
    if (order.paymentStatus === 'paid') return res.json({ order: orderForCustomer(order) });
    let payment = await razorpayApi(`/payments/${encodeURIComponent(razorpayPaymentId)}`, 'GET');
    if (payment.order_id === order.razorpayOrderId && payment.status === 'authorized') {
      payment = await razorpayApi(`/payments/${encodeURIComponent(razorpayPaymentId)}/capture`, 'POST', {
        amount: payment.amount,
        currency: 'INR'
      });
    }
    if (payment.order_id !== order.razorpayOrderId || payment.amount !== order.total * 100 ||
        payment.currency !== 'INR' || payment.status !== 'captured') {
      return res.status(409).json({ error: 'Payment has not been captured. Please contact the shop before trying again.' });
    }
    order.paymentStatus = 'paid';
    order.status = 'placed';
    order.razorpayPaymentId = razorpayPaymentId;
    await order.save();
    res.json({ order: orderForCustomer(order) });
  } catch (error) {
    console.error('Unable to verify Razorpay payment:', error);
    res.status(error.message?.includes('Online payment') ? 502 : 500).json({
      error: error.message?.includes('Online payment') ? error.message : 'Unable to verify payment right now. Please contact the shop with your payment reference.'
    });
  }
});

app.get('/api/orders/track', async (req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Order tracking is unavailable until the database is connected.' });
  const trackingCode = typeof req.query.reference === 'string' ? req.query.reference.trim().toUpperCase() : '';
  const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
  if (!trackingCode || !email || email.length > 254) return res.status(400).json({ error: 'Enter the order reference and email address used at checkout.' });
  try {
    const order = await Order.findOne({ trackingCode, email }).lean();
    if (!order) return res.status(404).json({ error: 'No order matched that reference and email address.' });
    res.json({ order: orderForCustomer(order) });
  } catch (error) {
    console.error('Unable to look up tracked order:', error);
    res.status(500).json({ error: 'Unable to look up your order right now.' });
  }
});

app.get('/api/account/orders', requireCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.customer._id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ orders: orders.map(orderForCustomer) });
  } catch (error) {
    console.error('Unable to load customer orders:', error);
    res.status(500).json({ error: 'Unable to load your orders right now.' });
  }
});

app.get('/api/products/:slug/reviews', async (req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Verified reviews are unavailable until the customer database is connected.' });
  try {
    const reviews = await ProductReview.find({ productSlug: req.params.slug }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ reviews: reviews.map(({ customerName, rating, body, createdAt }) => ({ customerName, rating, body, createdAt, verifiedPurchase: true })) });
  } catch (error) {
    console.error('Unable to load product reviews:', error);
    res.status(500).json({ error: 'Unable to load reviews right now.' });
  }
});

app.get('/api/reviews/recent', async (_req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Verified reviews are unavailable until the customer database is connected.' });
  try {
    const reviews = await ProductReview.find().sort({ createdAt: -1 }).limit(8).lean();
    const products = await Product.find({ slug: { $in: [...new Set(reviews.map((review) => review.productSlug))] } })
      .select('name slug').lean();
    const productNames = new Map(products.map((product) => [product.slug, product.name]));
    res.json({
      reviews: reviews.map((review) => ({
        customerName: review.customerName.trim().split(/\s+/)[0],
        rating: review.rating,
        body: review.body,
        productName: productNames.get(review.productSlug) || 'Gombe piece',
        productSlug: review.productSlug,
        createdAt: review.createdAt
      }))
    });
  } catch (error) {
    console.error('Unable to load recent verified reviews:', error);
    res.status(500).json({ error: 'Unable to load recent reviews right now.' });
  }
});

app.post('/api/products/:slug/reviews', requireSameOrigin, requireCustomer, async (req, res) => {
  const rating = Number(req.body?.rating);
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !body || body.length > 1200) {
    return res.status(400).json({ error: 'Choose a 1–5 star rating and write a review (up to 1,200 characters).' });
  }
  try {
    const order = await Order.findOne({
      customerId: req.customer._id,
      status: 'delivered',
      'items.slug': req.params.slug
    }).sort({ createdAt: -1 });
    if (!order) return res.status(403).json({ error: 'Reviews are available to signed-in customers after a Gombe order is marked delivered.' });
    const review = await ProductReview.create({
      customerId: req.customer._id,
      orderId: order._id,
      productSlug: req.params.slug,
      customerName: req.customer.name,
      rating,
      body
    });
    res.status(201).json({ review: { customerName: review.customerName, rating: review.rating, body: review.body, createdAt: review.createdAt, verifiedPurchase: true } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'You have already reviewed this piece.' });
    console.error('Unable to save product review:', error);
    res.status(500).json({ error: 'Unable to save your review right now.' });
  }
});

app.post('/api/support-requests', requireSameOrigin, async (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const orderReference = typeof body.orderReference === 'string' ? body.orderReference.trim() : '';
  if (!name || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !['Order help', 'Product question', 'Gift support', 'Returns and exchanges', 'Other'].includes(topic) ||
      !message || message.length > 2000 || orderReference.length > 40) {
    return res.status(400).json({ error: 'Complete the required contact fields and keep your message under 2,000 characters.' });
  }
  if (!databaseReady) return res.status(503).json({ error: 'The contact form is temporarily unavailable. Please try again later.' });
  try {
    const request = await SupportRequest.create({ name, email, topic, message, orderReference });
    res.status(201).json({ id: request.id, message: 'Your message is with our customer care team.' });
  } catch (error) {
    console.error('Unable to save customer support request:', error);
    res.status(500).json({ error: 'Unable to send your message right now. Please try again.' });
  }
});

app.post('/api/newsletter', requireSameOrigin, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!databaseReady) return res.status(503).json({ error: 'Newsletter sign-up is temporarily unavailable. Please try again later.' });
  try {
    await NewsletterSubscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
    res.status(201).json({ message: 'You’re on the list. Look out for a little joy in your inbox.' });
  } catch (error) {
    console.error('Unable to save newsletter subscription:', error);
    res.status(500).json({ error: 'Unable to sign you up right now. Please try again.' });
  }
});

app.get('/api/auth/session', async (req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Customer accounts are unavailable until MongoDB is connected.' });
  const userId = customerSessionToken(req);
  if (!userId) return res.json({ authenticated: false });
  try {
    const customer = await Customer.findById(userId);
    if (!customer) return res.json({ authenticated: false });
    res.json({ authenticated: true, ...customerAccountData(customer) });
  } catch (error) {
    console.error('Unable to load customer session:', error);
    res.status(500).json({ error: 'Unable to load your account right now.' });
  }
});

app.post('/api/auth/signup', requireSameOrigin, async (req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Customer accounts are unavailable until MongoDB is connected.' });
  if (!customerSessionSecret()) return res.status(503).json({ error: 'Customer account sessions are not configured on this server.' });
  if (!checkCustomerAuthRateLimit(req, res)) return;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!name || name.length > 80) return res.status(400).json({ error: 'Enter your name (80 characters or fewer).' });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Your password must be between 8 and 128 characters.' });
  try {
    const passwordSalt = crypto.randomBytes(16).toString('hex');
    const passwordHash = (await scrypt(password, passwordSalt, 64)).toString('hex');
    const customer = await Customer.create({ name, email, passwordSalt, passwordHash });
    setCustomerCookie(res, customer.id);
    customerAuthAttempts.delete(req.ip);
    res.status(201).json({ authenticated: true, ...customerAccountData(customer) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
    console.error('Unable to create customer account:', error);
    res.status(500).json({ error: 'Unable to create your account right now.' });
  }
});

app.post('/api/auth/login', requireSameOrigin, async (req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Customer accounts are unavailable until MongoDB is connected.' });
  if (!customerSessionSecret()) return res.status(503).json({ error: 'Customer account sessions are not configured on this server.' });
  if (!checkCustomerAuthRateLimit(req, res)) return;
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || email.length > 254 || password.length > 128) return res.status(400).json({ error: 'Enter your email and password.' });
  try {
    const customer = await Customer.findOne({ email });
    const passwordHash = customer
      ? (await scrypt(password, customer.passwordSalt, 64)).toString('hex')
      : (await scrypt(password, 'gombe-invalid-account-salt', 64)).toString('hex');
    if (!customer || !safeEqual(passwordHash, customer.passwordHash)) {
      recordCustomerAuthFailure(req);
      return res.status(401).json({ error: 'The email or password is incorrect.' });
    }
    setCustomerCookie(res, customer.id);
    customerAuthAttempts.delete(req.ip);
    res.json({ authenticated: true, ...customerAccountData(customer) });
  } catch (error) {
    console.error('Unable to sign in customer:', error);
    res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

app.post('/api/auth/logout', requireSameOrigin, (_req, res) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${customerCookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
  res.json({ authenticated: false });
});

app.put('/api/account', requireSameOrigin, requireCustomer, async (req, res) => {
  const cart = req.body?.cart;
  const wishlist = req.body?.wishlist;
  if (!Array.isArray(cart) || cart.length > 100 || !Array.isArray(wishlist) || wishlist.length > 100) {
    return res.status(400).json({ error: 'Your bag or wishlist contains too many items.' });
  }
  const normalizedCart = new Map();
  for (const item of cart) {
    const slug = typeof item?.slug === 'string' ? item.slug : '';
    const quantity = Number(item?.quantity);
    if (!slug || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ error: 'Your bag contains an invalid item or quantity.' });
    }
    normalizedCart.set(slug, Math.min(99, (normalizedCart.get(slug) || 0) + quantity));
  }
  const normalizedWishlist = [...new Set(wishlist)];
  if (normalizedWishlist.some((slug) => typeof slug !== 'string' || !slug)) {
    return res.status(400).json({ error: 'Your wishlist contains an invalid item.' });
  }
  try {
    const productSlugs = [...new Set([...normalizedCart.keys(), ...normalizedWishlist])];
    const existingSlugs = new Set((await Product.find({ slug: { $in: productSlugs } }).distinct('slug')));
    if (productSlugs.some((slug) => !existingSlugs.has(slug))) {
      return res.status(400).json({ error: 'Your bag or wishlist contains an unavailable product. Refresh the shop and try again.' });
    }
    req.customer.cart = [...normalizedCart].map(([slug, quantity]) => ({ slug, quantity }));
    req.customer.wishlist = normalizedWishlist;
    await req.customer.save();
    res.json({ saved: true });
  } catch (error) {
    console.error('Unable to save customer bag and wishlist:', error);
    res.status(500).json({ error: 'Unable to save your bag and wishlist right now.' });
  }
});

app.get('/api/admin/session', (req, res) => {
  res.json({ configured: adminIsConfigured(), authenticated: adminIsConfigured() && hasValidAdminSession(req) });
});

app.post('/api/admin/login', requireSameOrigin, (req, res) => {
  if (!adminIsConfigured()) return res.status(503).json({ error: 'Set ADMIN_USERNAME, ADMIN_PASSWORD, and a 32-character ADMIN_SESSION_SECRET in the server environment first.' });
  const clientKey = req.ip;
  const attempt = loginAttempts.get(clientKey);
  const now = Date.now();
  if (attempt?.blockedUntil > now) return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' });
  const usernameMatches = safeEqual(req.body?.username || '', process.env.ADMIN_USERNAME);
  const passwordMatches = safeEqual(req.body?.password || '', process.env.ADMIN_PASSWORD);
  if (!usernameMatches || !passwordMatches) {
    const failures = attempt?.blockedUntil && attempt.blockedUntil <= now ? 0 : (attempt?.failures || 0);
    const nextFailures = failures + 1;
    loginAttempts.set(clientKey, { failures: nextFailures, blockedUntil: nextFailures >= 5 ? now + 15 * 60 * 1000 : 0 });
    return res.status(401).json({ error: 'The username or password is incorrect.' });
  }
  loginAttempts.delete(clientKey);
  const expiresAt = Math.floor(now / 1000) + adminSessionDuration;
  const token = `${expiresAt}.${signAdminSession(expiresAt)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${adminCookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${adminSessionDuration}${secure}`);
  res.json({ authenticated: true });
});

app.post('/api/admin/logout', requireSameOrigin, requireAdmin, (_req, res) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${adminCookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
  res.json({ authenticated: false });
});

app.get('/api/admin/products', requireAdmin, async (_req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Connect MongoDB to manage and save products.' });
  try {
    res.json(await Product.find().sort({ createdAt: -1 }).lean());
  } catch (error) {
    console.error('Unable to load admin products:', error);
    res.status(500).json({ error: 'Unable to load products right now.' });
  }
});

app.post(
  '/api/admin/product-images',
  requireSameOrigin,
  requireAdmin,
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }),
  async (req, res) => {
    if (!databaseReady) return res.status(503).json({ error: 'Connect MongoDB before uploading product photos.' });
    const contentType = req.get('content-type')?.split(';')[0].trim().toLowerCase();
    const signatures = {
      'image/jpeg': { extension: 'jpg', matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
      'image/png': { extension: 'png', matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
      'image/webp': { extension: 'webp', matches: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' }
    };
    const imageType = signatures[contentType];
    if (!imageType || !Buffer.isBuffer(req.body) || req.body.length === 0 || !imageType.matches(req.body)) {
      return res.status(400).json({ error: 'Upload a valid JPG, PNG, or WebP image no larger than 5 MB.' });
    }
    try {
      const filename = `${crypto.randomBytes(16).toString('hex')}.${imageType.extension}`;
      const uploadDirectory = path.join(__dirname, 'public', 'uploads');
      await mkdir(uploadDirectory, { recursive: true });
      await writeFile(path.join(uploadDirectory, filename), req.body, { flag: 'wx' });
      res.status(201).json({ url: `/uploads/${filename}` });
    } catch (error) {
      console.error('Unable to save product image:', error);
      res.status(500).json({ error: 'Unable to save this product image right now.' });
    }
  }
);

app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Connect MongoDB to view customer orders.' });
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json(orders.map((order) => ({
      ...orderForCustomer(order),
      customerName: order.customerName,
      email: order.email,
      phone: order.phone,
      address: order.address,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      giftWrapFee: order.giftWrapFee,
      giftWrap: order.giftWrap,
      giftMessage: order.giftMessage
    })));
  } catch (error) {
    console.error('Unable to load admin orders:', error);
    res.status(500).json({ error: 'Unable to load customer orders right now.' });
  }
});

app.patch('/api/admin/orders/:trackingCode', requireSameOrigin, requireAdmin, async (req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Connect MongoDB to update customer orders.' });
  const allowedStatuses = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const status = req.body?.status;
  const paymentReceived = req.body?.paymentReceived === true;
  if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Choose a valid order status.' });
  try {
    const order = await Order.findOne({ trackingCode: req.params.trackingCode });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (paymentReceived && order.paymentMethod !== 'cod') return res.status(400).json({ error: 'Only cash-on-delivery orders can be marked as collected here.' });
    order.status = status;
    if (paymentReceived) order.paymentStatus = 'paid';
    await order.save();
    res.json({ order: orderForCustomer(order) });
  } catch (error) {
    console.error('Unable to update admin order:', error);
    res.status(500).json({ error: 'Unable to update this order right now.' });
  }
});

app.post('/api/admin/products', requireSameOrigin, requireAdmin, async (req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Connect MongoDB before adding products so changes can be saved.' });
  const result = validateProduct(req.body || {});
  if (result.error) return res.status(400).json({ error: result.error });
  try {
    const baseSlug = result.product.name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'toy';
    let slug = baseSlug;
    let suffix = 2;
    while (await Product.exists({ slug })) slug = `${baseSlug}-${suffix++}`;
    const product = await Product.create({ ...result.product, slug });
    res.status(201).json(product);
  } catch (error) {
    console.error('Unable to create admin product:', error);
    res.status(500).json({ error: 'Unable to save this product right now.' });
  }
});

app.put('/api/admin/products/:slug', requireSameOrigin, requireAdmin, async (req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Connect MongoDB before editing products.' });
  const result = validateProduct(req.body || {});
  if (result.error) return res.status(400).json({ error: result.error });
  try {
    const existing = await Product.findOne({ slug: req.params.slug }).lean();
    if (!existing) return res.status(404).json({ error: 'Product not found.' });
    const product = await Product.findOneAndUpdate(
      { slug: req.params.slug },
      { ...result.product, rating: existing.rating ?? 5, reviews: existing.reviews ?? 0 },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (error) {
    console.error('Unable to update admin product:', error);
    res.status(500).json({ error: 'Unable to update this product right now.' });
  }
});

app.delete('/api/admin/products/:slug', requireSameOrigin, requireAdmin, async (req, res) => {
  if (!databaseReady) return res.status(503).json({ error: 'Connect MongoDB before removing products.' });
  try {
    const product = await Product.findOneAndDelete({ slug: req.params.slug });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ deleted: true });
  } catch (error) {
    console.error('Unable to delete admin product:', error);
    res.status(500).json({ error: 'Unable to remove this product right now.' });
  }
});

app.post('/api/custom-requests', async (req, res) => {
  const { name, email, style, size, note, imageName } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });
  try {
    if (databaseReady) {
      const request = await CustomRequest.create({ name, email, style, size, note, imageName });
      return res.status(201).json({ id: request.id, message: 'Your studio request is on its way.' });
    }
    res.status(201).json({ id: `demo-${Date.now()}`, message: 'Your studio request is on its way.' });
  } catch (error) {
    res.status(500).json({ error: 'We could not save your request. Please try again.' });
  }
});

app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, () => console.log(`Gombe is running at http://localhost:${port}`));
