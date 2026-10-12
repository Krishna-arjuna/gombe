import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;
const adminCookieName = 'gombe_admin';
const adminSessionDuration = 8 * 60 * 60;
const loginAttempts = new Map();

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

const Product = mongoose.model('Product', productSchema);
const CustomRequest = mongoose.model('CustomRequest', customRequestSchema);

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

  if (!name || name.length > 80) return { error: 'Name is required and must be 80 characters or fewer.' };
  if (!Number.isInteger(price) || price <= 0 || price > 100000) return { error: 'Enter a whole-dollar price greater than $0 and no more than $100,000.' };
  if (!variant || variant.length > 80) return { error: 'Description is required and must be 80 characters or fewer.' };
  if (!allowedStyles.includes(style)) return { error: 'Choose a valid toy style.' };
  if (!allowedAgeGroups.includes(ageGroup)) return { error: 'Choose a valid recommended age.' };
  if (!allowedImages.includes(imageClass)) return { error: 'Choose a valid illustration style.' };
  if (badge.length > 30) return { error: 'Badge must be 30 characters or fewer.' };
  if (imageUrl) {
    try {
      if (new URL(imageUrl).protocol !== 'https:') return { error: 'Image links must use HTTPS.' };
    } catch {
      return { error: 'Enter a valid HTTPS image link.' };
    }
    if (imageUrl.length > 2048) return { error: 'Image link must be 2,048 characters or fewer.' };
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
      color: { royal: 'red', peacock: 'blue', wobble: 'yellow', menagerie: 'green', story: 'red', tops: 'yellow' }[imageClass],
      rating: 5,
      reviews: 0,
      inStock: true
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

app.get('/api/products', async (req, res) => {
  try {
    const items = databaseReady ? await Product.find().sort({ createdAt: -1 }).lean() : catalog;
    res.json(filterCatalog(items, req.query));
  } catch (error) {
    res.status(500).json({ error: 'Unable to load the collection.' });
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
      { ...result.product, rating: existing.rating ?? 5, reviews: existing.reviews ?? 0, inStock: existing.inStock ?? true },
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
