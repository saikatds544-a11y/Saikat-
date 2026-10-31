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
  updateOrderStatusById,
  updateSiteSettings,
  verifyAdminRequestToken,
} from '../../src/server/repository.ts';

interface NetlifyEvent {
  path: string;
  httpMethod: string;
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  body?: string | null;
}

function jsonResponse(statusCode: number, data: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(data),
  };
}

export const handler = async (event: NetlifyEvent) => {
  const route = event.path
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '') || '/';
  const method = event.httpMethod.toUpperCase();
  const body = event.body ? JSON.parse(event.body) : {};

  try {
    if (method === 'GET' && route === '/storefront') {
      return jsonResponse(200, await getStorefrontBundle());
    }

    if (method === 'POST' && route === '/orders') {
      const order = await createCustomerOrder(body);
      return jsonResponse(201, { order });
    }

    if (method === 'GET' && route === '/orders/track') {
      const orderNumber = event.queryStringParameters?.orderNumber || '';
      const mobile = event.queryStringParameters?.mobile || '';
      const order = await trackCustomerOrder(orderNumber, mobile);
      if (!order) {
        return jsonResponse(404, { error: 'Order not found.' });
      }
      return jsonResponse(200, { order });
    }

    if (method === 'POST' && route === '/admin/login') {
      const res = await authenticateAdminCredentials(
        String(body.email || ''),
        String(body.password || '')
      );
      if (!res.success) return jsonResponse(401, { error: res.error });
      return jsonResponse(200, { token: res.token, email: res.email });
    }

    // Protected Admin Endpoints
    if (route.startsWith('/admin')) {
      const authHeader = event.headers.authorization || event.headers.Authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const check = await verifyAdminRequestToken(token);
      if (!check.valid) {
        return jsonResponse(401, { error: 'Unauthorized admin request.' });
      }

      if (method === 'GET' && route === '/admin/session') {
        return jsonResponse(200, { authenticated: true, email: check.email });
      }

      if (method === 'GET' && route === '/admin/dashboard') {
        const [stats, orders, storefront] = await Promise.all([
          getAdminDashboardStats(),
          getAllOrdersForAdmin(),
          getStorefrontBundle(),
        ]);
        return jsonResponse(200, {
          stats,
          orders,
          products: storefront.products,
          categories: storefront.categories,
          settings: storefront.settings,
        });
      }

      if (method === 'POST' && route === '/admin/products') {
        return jsonResponse(201, { product: await createOrUpdateProduct(body) });
      }

      const prodMatch = route.match(/^\/admin\/products\/([^/]+)$/);
      if (prodMatch) {
        if (method === 'PUT') {
          return jsonResponse(200, {
            product: await createOrUpdateProduct(body, prodMatch[1]),
          });
        }
        if (method === 'DELETE') {
          await deleteProductById(prodMatch[1]);
          return jsonResponse(200, { success: true });
        }
      }

      if (method === 'POST' && route === '/admin/categories') {
        return jsonResponse(201, { category: await saveCategory(body) });
      }

      const catMatch = route.match(/^\/admin\/categories\/([^/]+)$/);
      if (catMatch) {
        if (method === 'PUT') {
          return jsonResponse(200, { category: await saveCategory(body, catMatch[1]) });
        }
        if (method === 'DELETE') {
          await deleteCategoryById(catMatch[1]);
          return jsonResponse(200, { success: true });
        }
      }

      const orderStatusMatch = route.match(/^\/admin\/orders\/([^/]+)\/status$/);
      if (orderStatusMatch && method === 'PATCH') {
        return jsonResponse(200, {
          order: await updateOrderStatusById(orderStatusMatch[1], body.status),
        });
      }

      if (method === 'PUT' && route === '/admin/settings') {
        return jsonResponse(200, { settings: await updateSiteSettings(body) });
      }

      if (method === 'POST' && route === '/admin/upload') {
        const url = await saveUploadedImageBase64(
          String(body.fileName || 'jewellery.jpg'),
          String(body.dataUrl || '')
        );
        return jsonResponse(201, { url });
      }
    }

    return jsonResponse(404, { error: 'Endpoint not found.' });
  } catch (err: any) {
    return jsonResponse(400, { error: err.message || 'Server error.' });
  }
};
