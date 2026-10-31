import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type {
  Category,
  Product,
  Order,
  OrderStatus,
  SiteSettings,
  CustomerReview,
  AdminDashboardStats,
} from '../types/store.ts';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_REVIEWS,
  INITIAL_ORDERS,
} from '../data/seedData.ts';

interface StoredAdminAuth {
  email: string;
  passwordSalt: string;
  passwordHash: string;
}

interface LocalDatabaseSchema {
  categories: Category[];
  products: Product[];
  orders: Order[];
  settings: SiteSettings;
  reviews: CustomerReview[];
  adminAuth: StoredAdminAuth;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store-db.json');
const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function getSecretKey(): string {
  return (
    process.env.ADMIN_JWT_SECRET ||
    'mla-heritage-admin-hmac-secret-2026-bangladesh-secure'
  );
}

export function createAdminToken(email: string): string {
  const payload = {
    email,
    role: 'admin',
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(base64Payload)
    .digest('base64url');
  return `${base64Payload}.${signature}`;
}

export function verifyAdminToken(token: string): { valid: boolean; email?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };
    const [base64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getSecretKey())
      .update(base64Payload)
      .digest('base64url');
    if (signature.length !== expectedSig.length) return { valid: false };
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return { valid: false };
    }
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf-8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false };
    }
    return { valid: true, email: payload.email };
  } catch {
    return { valid: false };
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

function ensureLocalDb(): LocalDatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const defaultEmail = (
      process.env.ADMIN_DEFAULT_EMAIL || 'admin@maalakshmialankar.com'
    ).toLowerCase();
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'MaaLakshmi@2026';
    const salt = crypto.randomBytes(16).toString('hex');
    const initialData: LocalDatabaseSchema = {
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      orders: INITIAL_ORDERS,
      settings: INITIAL_SETTINGS,
      reviews: INITIAL_REVIEWS,
      adminAuth: {
        email: defaultEmail,
        passwordSalt: salt,
        passwordHash: hashPassword(defaultPassword, salt),
      },
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw) as LocalDatabaseSchema;
}

function saveLocalDb(data: LocalDatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `item-${Date.now()}`;
}

export async function verifyAdminRequestToken(token: string): Promise<{ valid: boolean; email?: string }> {
  // 1. Verify HMAC signed server token
  const localCheck = verifyAdminToken(token);
  if (localCheck.valid) return localCheck;

  // 2. If Supabase Admin is configured, also support Supabase Auth JWTs checked against admin_profiles
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data.user) {
        const { data: adminRow } = await supabaseAdmin
          .from('admin_profiles')
          .select('email')
          .eq('id', data.user.id)
          .maybeSingle();
        if (adminRow) {
          return { valid: true, email: adminRow.email };
        }
      }
    } catch {
      // Fall through
    }
  }
  return { valid: false };
}

export async function authenticateAdminCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; token?: string; email?: string; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  // Check Supabase Auth if configured
  if (supabaseAdmin && process.env.VITE_SUPABASE_ANON_KEY) {
    try {
      const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
      const { data, error } = await anonClient.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (!error && data.session && data.user) {
        const { data: adminProfile } = await supabaseAdmin
          .from('admin_profiles')
          .select('email')
          .eq('id', data.user.id)
          .maybeSingle();
        if (adminProfile) {
          return {
            success: true,
            token: data.session.access_token,
            email: adminProfile.email,
          };
        }
      }
    } catch {
      // Fallback to local admin store if Supabase tables aren't seeded yet
    }
  }

  const db = ensureLocalDb();
  if (normalizedEmail !== db.adminAuth.email.toLowerCase()) {
    return { success: false, error: 'Invalid admin email or password.' };
  }
  const computedHash = hashPassword(password, db.adminAuth.passwordSalt);
  const valid = crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(db.adminAuth.passwordHash, 'hex')
  );
  if (!valid) {
    return { success: false, error: 'Invalid admin email or password.' };
  }
  return {
    success: true,
    token: createAdminToken(db.adminAuth.email),
    email: db.adminAuth.email,
  };
}

export async function updateAdminCredentials(
  newEmail: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const db = ensureLocalDb();
  const currentHash = hashPassword(currentPassword, db.adminAuth.passwordSalt);
  if (currentHash !== db.adminAuth.passwordHash) {
    return { success: false, error: 'Current password is incorrect.' };
  }
  const newSalt = crypto.randomBytes(16).toString('hex');
  db.adminAuth = {
    email: newEmail.trim().toLowerCase() || db.adminAuth.email,
    passwordSalt: newSalt,
    passwordHash: hashPassword(newPassword, newSalt),
  };
  saveLocalDb(db);
  return { success: true };
}

// -----------------------------------------------------------------------------
// STOREFRONT & ADMIN DATA OPERATIONS
// -----------------------------------------------------------------------------

function mapPgProduct(row: Record<string, any>): Product {
  return {
    id: row.id,
    productCode: row.product_code,
    slug: row.slug,
    name: row.name,
    nameBn: row.name_bn || '',
    description: row.description || '',
    descriptionBn: row.description_bn || '',
    regularPrice: Number(row.regular_price),
    discountPrice: row.discount_price !== null ? Number(row.discount_price) : null,
    category: row.category,
    stockQuantity: Number(row.stock_quantity),
    inStock: Boolean(row.in_stock) && Number(row.stock_quantity) > 0,
    variations: Array.isArray(row.variations) ? row.variations : [],
    images: Array.isArray(row.images) ? row.images : [],
    purity: row.purity || '22K (916 Hallmarked)',
    weightInfo: row.weight_info || '',
    isFeatured: Boolean(row.is_featured),
    isBestSeller: Boolean(row.is_best_seller),
    isNewArrival: Boolean(row.is_new_arrival),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPgCategory(row: Record<string, any>): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameBn: row.name_bn || '',
    description: row.description || '',
    descriptionBn: row.description_bn || '',
    image: row.image || '',
    sortOrder: Number(row.sort_order || 1),
  };
}

function mapPgOrder(row: Record<string, any>): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    mobileNumber: row.mobile_number,
    district: row.district,
    upazila: row.upazila,
    fullAddress: row.full_address,
    orderNotes: row.order_notes || '',
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: Number(row.subtotal),
    deliveryCharge: Number(row.delivery_charge),
    totalAmount: Number(row.total_amount),
    paymentMethod: 'Cash on Delivery',
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getStorefrontBundle(): Promise<{
  categories: Category[];
  products: Product[];
  settings: SiteSettings;
  reviews: CustomerReview[];
}> {
  if (supabaseAdmin) {
    try {
      const [catRes, prodRes, setRes] = await Promise.all([
        supabaseAdmin.from('categories').select('*').order('sort_order', { ascending: true }),
        supabaseAdmin.from('products').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      ]);
      if (!catRes.error && !prodRes.error && catRes.data && catRes.data.length > 0) {
        return {
          categories: catRes.data.map(mapPgCategory),
          products: prodRes.data.map(mapPgProduct),
          settings: setRes.data?.settings
            ? { ...INITIAL_SETTINGS, ...setRes.data.settings }
            : INITIAL_SETTINGS,
          reviews: INITIAL_REVIEWS,
        };
      }
    } catch {
      // Fallback to local persistent JSON store
    }
  }

  const db = ensureLocalDb();
  return {
    categories: [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder),
    products: [...db.products].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    settings: db.settings,
    reviews: db.reviews,
  };
}

export async function createOrUpdateProduct(
  payload: Partial<Product>,
  existingId?: string
): Promise<Product> {
  const db = ensureLocalDb();
  const now = new Date().toISOString();
  const cleanName = (payload.name || '').trim();
  if (!cleanName) {
    throw new Error('Product name is required.');
  }

  const regularPrice = Math.max(0, Number(payload.regularPrice || 0));
  const rawDiscount =
    payload.discountPrice !== null &&
    payload.discountPrice !== undefined &&
    String(payload.discountPrice) !== ''
      ? Number(payload.discountPrice)
      : null;
  const discountPrice =
    rawDiscount !== null && rawDiscount > 0 && rawDiscount < regularPrice ? rawDiscount : null;
  const stockQuantity = Math.max(0, Math.floor(Number(payload.stockQuantity ?? 0)));
  const inStock = payload.inStock !== undefined ? Boolean(payload.inStock) && stockQuantity > 0 : stockQuantity > 0;

  let baseSlug = slugify(payload.slug || cleanName);
  const duplicateSlug = db.products.find(
    (p) => p.slug === baseSlug && p.id !== existingId
  );
  if (duplicateSlug) {
    baseSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;
  }

  const productCode =
    (payload.productCode || '').trim() ||
    `MLA-22K-${Math.floor(1000 + Math.random() * 9000)}`;

  const productRecord: Product = {
    id: existingId || `prod-${Date.now()}`,
    productCode,
    slug: baseSlug,
    name: cleanName,
    nameBn: (payload.nameBn || '').trim(),
    description: (payload.description || '').trim(),
    descriptionBn: (payload.descriptionBn || '').trim(),
    regularPrice,
    discountPrice,
    category: payload.category || 'necklace',
    stockQuantity,
    inStock,
    variations: Array.isArray(payload.variations)
      ? payload.variations.map((v) => String(v).trim()).filter(Boolean)
      : [],
    images:
      Array.isArray(payload.images) && payload.images.length > 0
        ? payload.images.filter(Boolean)
        : [INITIAL_PRODUCTS[0].images[0]],
    purity: (payload.purity || '22K (916 Hallmarked)').trim(),
    weightInfo: (payload.weightInfo || '').trim(),
    isFeatured: Boolean(payload.isFeatured),
    isBestSeller: Boolean(payload.isBestSeller),
    isNewArrival: Boolean(payload.isNewArrival),
    createdAt: existingId
      ? db.products.find((p) => p.id === existingId)?.createdAt || now
      : now,
    updatedAt: now,
  };

  if (supabaseAdmin) {
    try {
      const pgPayload = {
        id: productRecord.id,
        product_code: productRecord.productCode,
        slug: productRecord.slug,
        name: productRecord.name,
        name_bn: productRecord.nameBn,
        description: productRecord.description,
        description_bn: productRecord.descriptionBn,
        regular_price: productRecord.regularPrice,
        discount_price: productRecord.discountPrice,
        category: productRecord.category,
        stock_quantity: productRecord.stockQuantity,
        in_stock: productRecord.inStock,
        variations: productRecord.variations,
        images: productRecord.images,
        purity: productRecord.purity,
        weight_info: productRecord.weightInfo,
        is_featured: productRecord.isFeatured,
        is_best_seller: productRecord.isBestSeller,
        is_new_arrival: productRecord.isNewArrival,
        updated_at: now,
      };
      const { data, error } = await supabaseAdmin
        .from('products')
        .upsert(pgPayload)
        .select('*')
        .single();
      if (!error && data) {
        return mapPgProduct(data);
      }
    } catch {
      // Continue to local persistence
    }
  }

  if (existingId) {
    const idx = db.products.findIndex((p) => p.id === existingId);
    if (idx === -1) throw new Error('Product not found.');
    db.products[idx] = productRecord;
  } else {
    db.products.unshift(productRecord);
  }
  saveLocalDb(db);
  return productRecord;
}

export async function deleteProductById(id: string): Promise<void> {
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('products').delete().eq('id', id);
    } catch {
      // Continue
    }
  }
  const db = ensureLocalDb();
  db.products = db.products.filter((p) => p.id !== id);
  saveLocalDb(db);
}

export async function saveCategory(
  payload: Partial<Category>,
  existingId?: string
): Promise<Category> {
  const db = ensureLocalDb();
  const cleanName = (payload.name || '').trim();
  if (!cleanName) throw new Error('Category name is required.');

  const slug = existingId
    ? payload.slug || slugify(cleanName)
    : slugify(payload.slug || cleanName);

  const catRecord: Category = {
    id: existingId || `cat-${Date.now()}`,
    slug,
    name: cleanName,
    nameBn: (payload.nameBn || '').trim() || cleanName,
    description: (payload.description || '').trim(),
    descriptionBn: (payload.descriptionBn || '').trim(),
    image: payload.image || INITIAL_CATEGORIES[0].image,
    sortOrder: Number(payload.sortOrder ?? db.categories.length + 1),
  };

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('categories').upsert({
        id: catRecord.id,
        slug: catRecord.slug,
        name: catRecord.name,
        name_bn: catRecord.nameBn,
        description: catRecord.description,
        description_bn: catRecord.descriptionBn,
        image: catRecord.image,
        sort_order: catRecord.sortOrder,
      });
    } catch {
      // Fallback
    }
  }

  if (existingId) {
    const idx = db.categories.findIndex((c) => c.id === existingId);
    if (idx !== -1) {
      const oldSlug = db.categories[idx].slug;
      db.categories[idx] = catRecord;
      if (oldSlug !== catRecord.slug) {
        db.products = db.products.map((p) =>
          p.category === oldSlug ? { ...p, category: catRecord.slug } : p
        );
      }
    }
  } else {
    db.categories.push(catRecord);
  }
  saveLocalDb(db);
  return catRecord;
}

export async function deleteCategoryById(id: string): Promise<void> {
  const db = ensureLocalDb();
  const target = db.categories.find((c) => c.id === id);
  if (!target) return;
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('categories').delete().eq('id', id);
    } catch {
      // Fallback
    }
  }
  db.categories = db.categories.filter((c) => c.id !== id);
  db.products = db.products.map((p) =>
    p.category === target.slug ? { ...p, category: 'other-jewellery' } : p
  );
  saveLocalDb(db);
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const db = ensureLocalDb();
  const merged: SiteSettings = {
    ...db.settings,
    ...patch,
    insideDhakaDelivery: Math.max(0, Number(patch.insideDhakaDelivery ?? db.settings.insideDhakaDelivery)),
    outsideDhakaDelivery: Math.max(0, Number(patch.outsideDhakaDelivery ?? db.settings.outsideDhakaDelivery)),
    freeDeliveryThreshold: Math.max(0, Number(patch.freeDeliveryThreshold ?? db.settings.freeDeliveryThreshold)),
  };

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('site_settings').upsert({
        id: 1,
        settings: merged,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Fallback
    }
  }

  db.settings = merged;
  saveLocalDb(db);
  return merged;
}

export interface CreateOrderInput {
  customerName: string;
  mobileNumber: string;
  district: string;
  upazila: string;
  fullAddress: string;
  orderNotes?: string;
  items: Array<{
    productId: string;
    variation: string;
    quantity: number;
  }>;
}

export async function createCustomerOrder(input: CreateOrderInput): Promise<Order> {
  const customerName = (input.customerName || '').trim();
  const mobileNumber = (input.mobileNumber || '').trim();
  const district = (input.district || '').trim();
  const upazila = (input.upazila || '').trim();
  const fullAddress = (input.fullAddress || '').trim();

  if (customerName.length < 2) {
    throw new Error('Please enter your full name.');
  }
  const digits = mobileNumber.replace(/[^0-9]/g, '');
  const validBdPhone = /^(?:88)?01[3-9]\d{8}$/.test(digits);
  if (!validBdPhone) {
    throw new Error('Please enter a valid 11-digit Bangladesh mobile number (e.g., 017XXXXXXXX).');
  }
  if (!district || !upazila) {
    throw new Error('Please select your District and Upazila.');
  }
  if (fullAddress.length < 6) {
    throw new Error('Please enter your complete delivery address.');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('Your shopping cart is empty.');
  }

  const bundle = await getStorefrontBundle();
  const db = ensureLocalDb();

  let subtotal = 0;
  const orderItems = input.items.map((reqItem) => {
    const product = bundle.products.find((p) => p.id === reqItem.productId);
    if (!product) {
      throw new Error('One of the selected jewellery items is no longer available.');
    }
    const qty = Math.max(1, Math.floor(Number(reqItem.quantity || 1)));
    if (!product.inStock || product.stockQuantity < qty) {
      throw new Error(`Insufficient stock for "${product.name}". Only ${product.stockQuantity} remaining.`);
    }
    const unitPrice =
      product.discountPrice !== null && product.discountPrice < product.regularPrice
        ? product.discountPrice
        : product.regularPrice;
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;

    return {
      productId: product.id,
      productCode: product.productCode,
      name: product.name,
      nameBn: product.nameBn,
      image: product.images[0] || '',
      variation: reqItem.variation || product.variations[0] || 'Standard',
      quantity: qty,
      unitPrice,
      lineTotal,
    };
  });

  const isInsideDhaka = district.toLowerCase() === 'dhaka';
  const baseDelivery = isInsideDhaka
    ? bundle.settings.insideDhakaDelivery
    : bundle.settings.outsideDhakaDelivery;
  const deliveryCharge =
    bundle.settings.freeDeliveryThreshold > 0 && subtotal >= bundle.settings.freeDeliveryThreshold
      ? 0
      : baseDelivery;
  const totalAmount = subtotal + deliveryCharge;

  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `MLA-${datePart}-${randomSuffix}`;
  const now = new Date().toISOString();

  const newOrder: Order = {
    id: `ord-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    orderNumber,
    customerName,
    mobileNumber,
    district,
    upazila,
    fullAddress,
    orderNotes: (input.orderNotes || '').trim(),
    items: orderItems,
    subtotal,
    deliveryCharge,
    totalAmount,
    paymentMethod: 'Cash on Delivery',
    status: 'Pending',
    createdAt: now,
    updatedAt: now,
  };

  // Persist to Supabase if configured
  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.from('orders').insert({
        id: newOrder.id,
        order_number: newOrder.orderNumber,
        customer_name: newOrder.customerName,
        mobile_number: newOrder.mobileNumber,
        district: newOrder.district,
        upazila: newOrder.upazila,
        full_address: newOrder.fullAddress,
        order_notes: newOrder.orderNotes,
        items: newOrder.items,
        subtotal: newOrder.subtotal,
        delivery_charge: newOrder.deliveryCharge,
        total_amount: newOrder.totalAmount,
        payment_method: 'Cash on Delivery',
        status: 'Pending',
      });
      if (!error) {
        for (const item of orderItems) {
          const prod = bundle.products.find((p) => p.id === item.productId);
          if (prod) {
            const nextStock = Math.max(0, prod.stockQuantity - item.quantity);
            await supabaseAdmin
              .from('products')
              .update({
                stock_quantity: nextStock,
                in_stock: nextStock > 0,
                updated_at: now,
              })
              .eq('id', prod.id);
          }
        }
      }
    } catch {
      // Fallback to local file persistence
    }
  }

  // Always keep local file DB updated as well
  for (const item of orderItems) {
    const localProd = db.products.find((p) => p.id === item.productId);
    if (localProd) {
      localProd.stockQuantity = Math.max(0, localProd.stockQuantity - item.quantity);
      localProd.inStock = localProd.stockQuantity > 0;
      localProd.updatedAt = now;
    }
  }
  db.orders.unshift(newOrder);
  saveLocalDb(db);

  return newOrder;
}

export async function getAllOrdersForAdmin(): Promise<Order[]> {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(mapPgOrder);
      }
    } catch {
      // Fallback
    }
  }
  const db = ensureLocalDb();
  return [...db.orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateOrderStatusById(
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  const allowedStatuses: OrderStatus[] = [
    'Pending',
    'Confirmed',
    'Processing',
    'Shipped',
    'Delivered',
    'Cancelled',
  ];
  if (!allowedStatuses.includes(status)) {
    throw new Error('Invalid order status.');
  }

  const now = new Date().toISOString();
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update({ status, updated_at: now })
        .eq('id', orderId)
        .select('*')
        .maybeSingle();
      if (!error && data) {
        return mapPgOrder(data);
      }
    } catch {
      // Fallback
    }
  }

  const db = ensureLocalDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) {
    throw new Error('Order not found.');
  }
  order.status = status;
  order.updatedAt = now;
  saveLocalDb(db);
  return order;
}

export async function trackCustomerOrder(
  orderNumber: string,
  mobileNumber?: string
): Promise<Order | null> {
  const cleanOrderNum = (orderNumber || '').trim().toUpperCase();
  if (!cleanOrderNum) return null;

  const orders = await getAllOrdersForAdmin();
  const found = orders.find((o) => o.orderNumber.toUpperCase() === cleanOrderNum);
  if (!found) return null;

  if (mobileNumber && mobileNumber.trim()) {
    const reqDigits = mobileNumber.replace(/[^0-9]/g, '').slice(-10);
    const ordDigits = found.mobileNumber.replace(/[^0-9]/g, '').slice(-10);
    if (reqDigits && ordDigits && reqDigits !== ordDigits) {
      return null;
    }
  }
  return found;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [orders, storefront] = await Promise.all([
    getAllOrdersForAdmin(),
    getStorefrontBundle(),
  ]);

  let pendingOrders = 0;
  let confirmedOrders = 0;
  let processingOrders = 0;
  let shippedOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let totalSales = 0;

  for (const o of orders) {
    if (o.status === 'Pending') pendingOrders++;
    else if (o.status === 'Confirmed') confirmedOrders++;
    else if (o.status === 'Processing') processingOrders++;
    else if (o.status === 'Shipped') shippedOrders++;
    else if (o.status === 'Delivered') deliveredOrders++;
    else if (o.status === 'Cancelled') cancelledOrders++;

    if (o.status !== 'Cancelled') {
      totalSales += o.totalAmount;
    }
  }

  const lowStockProducts = storefront.products.filter((p) => p.stockQuantity <= 3).length;

  return {
    totalOrders: orders.length,
    pendingOrders,
    confirmedOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    totalSales,
    totalProducts: storefront.products.length,
    lowStockProducts,
  };
}

export async function saveUploadedImageBase64(
  fileName: string,
  dataUrl: string
): Promise<string> {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image format. Please upload PNG, JPG, WEBP, or SVG.');
  }
  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.byteLength > 8 * 1024 * 1024) {
    throw new Error('Image file size must be under 8 MB.');
  }

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  const ext = extMap[mimeType] || 'jpg';
  const safeBase = slugify(fileName.replace(/\.[^.]+$/, '')).slice(0, 40) || 'jewellery';
  const uniqueName = `${safeBase}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}.${ext}`;

  // Upload to Supabase Storage if configured
  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.storage
        .from('jewellery-media')
        .upload(`uploads/${uniqueName}`, buffer, {
          contentType: mimeType,
          upsert: true,
        });
      if (!error) {
        const { data } = supabaseAdmin.storage
          .from('jewellery-media')
          .getPublicUrl(`uploads/${uniqueName}`);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      }
    } catch {
      // Fallback to local /uploads directory
    }
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), buffer);
  return `/uploads/${uniqueName}`;
}
