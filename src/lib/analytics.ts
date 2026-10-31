import type { CartItem, Order, Product, SiteSettings } from '../types/store.ts';
import { getEffectivePrice } from './formatters.ts';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    __mlaPixelInitializedId?: string;
    __mlaGa4InitializedId?: string;
  }
}

let activeSettings: SiteSettings | null = null;

export function configureAnalyticsScripts(settings: SiteSettings) {
  activeSettings = settings;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Meta Facebook Pixel Initialization
  const pixelId = (settings.metaPixelId || '').trim();
  if (settings.metaPixelEnabled && pixelId && window.__mlaPixelInitializedId !== pixelId) {
    if (!window.fbq) {
      const n: any = (window.fbq = function (...args: any[]) {
        if (n.callMethod) {
          n.callMethod.apply(n, args);
        } else {
          n.queue.push(args);
        }
      });
      if (!window._fbq) window._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
    window.fbq?.('init', pixelId);
    window.__mlaPixelInitializedId = pixelId;
  }

  // 2. Google Analytics 4 Initialization
  const ga4Id = (settings.ga4MeasurementId || '').trim();
  if (settings.ga4Enabled && ga4Id && window.__mlaGa4InitializedId !== ga4Id) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function (...args: any[]) {
      window.dataLayer?.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', ga4Id, { send_page_view: false });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
    document.head.appendChild(script);
    window.__mlaGa4InitializedId = ga4Id;
  }
}

function canFirePixel(): boolean {
  return Boolean(
    activeSettings?.metaPixelEnabled &&
      activeSettings?.metaPixelId?.trim() &&
      typeof window !== 'undefined' &&
      typeof window.fbq === 'function'
  );
}

function canFireGa4(): boolean {
  return Boolean(
    activeSettings?.ga4Enabled &&
      activeSettings?.ga4MeasurementId?.trim() &&
      typeof window !== 'undefined' &&
      typeof window.gtag === 'function'
  );
}

function pingServerCapi(eventName: string, customData: Record<string, any>) {
  if (!activeSettings?.metaPixelEnabled || !activeSettings?.metaPixelId?.trim()) return;
  fetch('/api/analytics/capi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName,
      eventSourceUrl: window.location.href,
      customData,
    }),
  }).catch(() => {});
}

export function trackPageView(path: string, pageTitle: string) {
  if (canFirePixel()) {
    window.fbq?.('track', 'PageView');
  }
  if (canFireGa4()) {
    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_title: pageTitle,
      page_location: window.location.href,
    });
  }
}

export function trackViewContent(product: Product) {
  const price = getEffectivePrice(product);
  const customData = {
    content_ids: [product.productCode],
    content_name: product.name,
    content_category: product.category,
    content_type: 'product',
    value: price,
    currency: 'BDT',
  };

  if (canFirePixel()) {
    window.fbq?.('track', 'ViewContent', customData);
  }
  pingServerCapi('ViewContent', customData);

  if (canFireGa4()) {
    window.gtag?.('event', 'view_item', {
      currency: 'BDT',
      value: price,
      items: [
        {
          item_id: product.productCode,
          item_name: product.name,
          item_category: product.category,
          price,
          quantity: 1,
        },
      ],
    });
  }
}

export function trackSearch(query: string) {
  const clean = query.trim();
  if (!clean) return;
  if (canFirePixel()) {
    window.fbq?.('track', 'Search', { search_string: clean });
  }
  if (canFireGa4()) {
    window.gtag?.('event', 'search', { search_term: clean });
  }
}

export function trackAddToCart(product: Product, quantity: number, variation: string) {
  const price = getEffectivePrice(product);
  const totalValue = price * quantity;
  const customData = {
    content_ids: [product.productCode],
    content_name: product.name,
    content_type: 'product',
    value: totalValue,
    currency: 'BDT',
  };

  if (canFirePixel()) {
    window.fbq?.('track', 'AddToCart', customData);
  }
  pingServerCapi('AddToCart', customData);

  if (canFireGa4()) {
    window.gtag?.('event', 'add_to_cart', {
      currency: 'BDT',
      value: totalValue,
      items: [
        {
          item_id: product.productCode,
          item_name: product.name,
          item_variant: variation,
          item_category: product.category,
          price,
          quantity,
        },
      ],
    });
  }
}

export function trackInitiateCheckout(items: CartItem[], subtotal: number) {
  const customData = {
    content_ids: items.map((i) => i.productCode),
    num_items: items.reduce((acc, i) => acc + i.quantity, 0),
    value: subtotal,
    currency: 'BDT',
  };

  if (canFirePixel()) {
    window.fbq?.('track', 'InitiateCheckout', customData);
  }
  pingServerCapi('InitiateCheckout', customData);

  if (canFireGa4()) {
    window.gtag?.('event', 'begin_checkout', {
      currency: 'BDT',
      value: subtotal,
      items: items.map((i) => ({
        item_id: i.productCode,
        item_name: i.name,
        item_variant: i.variation,
        price: i.unitPrice,
        quantity: i.quantity,
      })),
    });
  }
}

export function trackPurchase(order: Order) {
  if (canFirePixel()) {
    window.fbq?.('track', 'Purchase', {
      value: order.totalAmount,
      currency: 'BDT',
      content_ids: order.items.map((i) => i.productCode),
      content_type: 'product',
      order_id: order.orderNumber,
    });
  }

  if (canFireGa4()) {
    window.gtag?.('event', 'purchase', {
      transaction_id: order.orderNumber,
      currency: 'BDT',
      value: order.totalAmount,
      shipping: order.deliveryCharge,
      items: order.items.map((i) => ({
        item_id: i.productCode,
        item_name: i.name,
        item_variant: i.variation,
        price: i.unitPrice,
        quantity: i.quantity,
      })),
    });
  }
}

export function updateDocumentSeo(params: {
  title: string;
  description: string;
  keywords?: string;
  productSchema?: Product | null;
}) {
  if (typeof document === 'undefined') return;
  document.title = params.title;

  const setMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
    let el = document.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMeta('meta[name="description"]', 'name', 'description', params.description);
  setMeta('meta[property="og:title"]', 'property', 'og:title', params.title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', params.description);
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', params.title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', params.description);
  if (params.keywords) {
    setMeta('meta[name="keywords"]', 'name', 'keywords', params.keywords);
  }

  const existingProdSchema = document.getElementById('product-schema-jsonld');
  if (params.productSchema) {
    const p = params.productSchema;
    const price = getEffectivePrice(p);
    const schemaObj = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      sku: p.productCode,
      description: p.description,
      category: p.category,
      brand: {
        '@type': 'Brand',
        name: activeSettings?.websiteName || 'Maa Lakshmi Alankar',
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'BDT',
        price: String(price),
        availability: p.inStock && p.stockQuantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url: window.location.href,
      },
    };
    const scriptEl =
      existingProdSchema ||
      Object.assign(document.createElement('script'), {
        type: 'application/ld+json',
        id: 'product-schema-jsonld',
      });
    scriptEl.textContent = JSON.stringify(schemaObj);
    if (!existingProdSchema) document.head.appendChild(scriptEl);
  } else if (existingProdSchema) {
    existingProdSchema.remove();
  }
}
