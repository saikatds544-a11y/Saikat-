import express from 'express';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  authenticateAdminCredentials,
  createCustomerOrder,
  createOrUpdateProduct,
  deleteCategoryById,
  deleteProductById,
  getAdminDashboardStats,
  getAllOrdersForAdmin,
  getStorefrontBundle,
  saveCategory,
  saveUploadedImageBase64,
  trackCustomerOrder,
  updateAdminCredentials,
  updateOrderStatusById,
  updateSiteSettings,
  verifyAdminRequestToken,
} from './repository.ts';

export const apiRouter = express.Router();

async function sendMetaConversionsEvent(params: {
  pixelId: string;
  eventName: string;
  eventSourceUrl?: string;
  clientIp?: string;
  userAgent?: string;
  customData?: Record<string, any>;
  customerPhone?: string;
}) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken || !params.pixelId) return;

  try {
    const userData: Record<string, any> = {};
    if (params.clientIp) userData.client_ip_address = params.clientIp;
    if (params.userAgent) userData.client_user_agent = params.userAgent;
    if (params.customerPhone) {
      const normalizedPhone = params.customerPhone.replace(/[^0-9]/g, '');
      const bdFormatted = normalizedPhone.startsWith('88')
        ? normalizedPhone
        : `88${normalizedPhone}`;
      userData.ph = [crypto.createHash('sha256').update(bdFormatted).digest('hex')];
    }

    await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(params.pixelId)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            event_name: params.eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_source_url: params.eventSourceUrl || process.env.APP_URL || '',
            user_data: userData,
            custom_data: params.customData || {},
          },
        ],
        access_token: accessToken,
      }),
    });
  } catch (err) {
    console.error('Meta CAPI dispatch warning:', err);
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const check = await verifyAdminRequestToken(token);
  if (!check.valid) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired admin session.' });
    return;
  }
  (req as any).adminEmail = check.email;
  next();
}

// -----------------------------------------------------------------------------
// PUBLIC STOREFRONT ENDPOINTS
// -----------------------------------------------------------------------------

apiRouter.get('/storefront', async (_req: Request, res: Response) => {
  try {
    const data = await getStorefrontBundle();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load storefront data.' });
  }
});

apiRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const order = await createCustomerOrder(req.body);
    const bundle = await getStorefrontBundle();

    if (bundle.settings.metaPixelEnabled && bundle.settings.metaPixelId) {
      void sendMetaConversionsEvent({
        pixelId: bundle.settings.metaPixelId,
        eventName: 'Purchase',
        eventSourceUrl: req.headers.referer,
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
        customerPhone: order.mobileNumber,
        customData: {
          currency: 'BDT',
          value: order.totalAmount,
          order_id: order.orderNumber,
          content_ids: order.items.map((i) => i.productCode),
          content_type: 'product',
        },
      });
    }

    res.status(201).json({ order });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Unable to place order.' });
  }
});

apiRouter.get('/orders/track', async (req: Request, res: Response) => {
  try {
    const orderNumber = String(req.query.orderNumber || '');
    const mobile = String(req.query.mobile || '');
    const order = await trackCustomerOrder(orderNumber, mobile);
    if (!order) {
      res.status(404).json({
        error: 'No matching order found. Please check your Order ID and Mobile Number.',
      });
      return;
    }
    res.json({ order });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Unable to look up order.' });
  }
});

apiRouter.post('/analytics/capi', async (req: Request, res: Response) => {
  try {
    const bundle = await getStorefrontBundle();
    if (bundle.settings.metaPixelEnabled && bundle.settings.metaPixelId) {
      const { eventName, customData, eventSourceUrl } = req.body || {};
      if (eventName) {
        await sendMetaConversionsEvent({
          pixelId: bundle.settings.metaPixelId,
          eventName: String(eventName),
          eventSourceUrl: String(eventSourceUrl || req.headers.referer || ''),
          clientIp: req.ip,
          userAgent: req.headers['user-agent'],
          customData: typeof customData === 'object' ? customData : {},
        });
      }
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// -----------------------------------------------------------------------------
// PRIVATE ADMIN AUTHENTICATION & MANAGEMENT ENDPOINTS
// -----------------------------------------------------------------------------

apiRouter.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const result = await authenticateAdminCredentials(String(email), String(password));
    if (!result.success || !result.token) {
      res.status(401).json({ error: result.error || 'Invalid credentials.' });
      return;
    }
    res.json({ token: result.token, email: result.email });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Authentication error.' });
  }
});

apiRouter.get('/admin/session', requireAdmin, async (req: Request, res: Response) => {
  res.json({ authenticated: true, email: (req as any).adminEmail });
});

apiRouter.post('/admin/password', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || String(newPassword).length < 8) {
      res.status(400).json({
        error: 'Current password and a new password (min 8 characters) are required.',
      });
      return;
    }
    const result = await updateAdminCredentials(
      String(email || (req as any).adminEmail),
      String(currentPassword),
      String(newPassword)
    );
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Unable to update password.' });
  }
});

apiRouter.get('/admin/dashboard', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [stats, orders, storefront] = await Promise.all([
      getAdminDashboardStats(),
      getAllOrdersForAdmin(),
      getStorefrontBundle(),
    ]);
    res.json({
      stats,
      orders,
      products: storefront.products,
      categories: storefront.categories,
      settings: storefront.settings,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Unable to load admin dashboard.' });
  }
});

apiRouter.post('/admin/products', requireAdmin, async (req: Request, res: Response) => {
  try {
    const product = await createOrUpdateProduct(req.body);
    res.status(201).json({ product });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create product.' });
  }
});

apiRouter.put('/admin/products/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const product = await createOrUpdateProduct(req.body, String(req.params.id));
    res.json({ product });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update product.' });
  }
});

apiRouter.delete('/admin/products/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await deleteProductById(String(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete product.' });
  }
});

apiRouter.post('/admin/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const category = await saveCategory(req.body);
    res.status(201).json({ category });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create category.' });
  }
});

apiRouter.put('/admin/categories/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const category = await saveCategory(req.body, String(req.params.id));
    res.json({ category });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update category.' });
  }
});

apiRouter.delete('/admin/categories/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await deleteCategoryById(String(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete category.' });
  }
});

apiRouter.patch('/admin/orders/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.body || {};
    const order = await updateOrderStatusById(String(req.params.id), status);
    res.json({ order });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update order status.' });
  }
});

apiRouter.put('/admin/settings', requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = await updateSiteSettings(req.body || {});
    res.json({ settings });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save website settings.' });
  }
});

apiRouter.post('/admin/upload', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { fileName, dataUrl } = req.body || {};
    if (!dataUrl) {
      res.status(400).json({ error: 'Image file payload is required.' });
      return;
    }
    const url = await saveUploadedImageBase64(String(fileName || 'jewellery.jpg'), String(dataUrl));
    res.status(201).json({ url });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Image upload failed.' });
  }
});
