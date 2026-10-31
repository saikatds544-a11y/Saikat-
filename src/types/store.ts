export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export type Language = 'en' | 'bn';

export interface Category {
  id: string;
  slug: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  image: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  productCode: string;
  slug: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  regularPrice: number;
  discountPrice: number | null;
  category: string; // category slug
  stockQuantity: number;
  inStock: boolean;
  variations: string[];
  images: string[];
  purity: string;
  weightInfo: string;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  productCode: string;
  slug: string;
  name: string;
  nameBn: string;
  image: string;
  unitPrice: number;
  regularPrice: number;
  variation: string;
  quantity: number;
  maxStock: number;
}

export interface OrderItem {
  productId: string;
  productCode: string;
  name: string;
  nameBn?: string;
  image: string;
  variation: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  mobileNumber: string;
  district: string;
  upazila: string;
  fullAddress: string;
  orderNotes: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  totalAmount: number;
  paymentMethod: 'Cash on Delivery';
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerReview {
  id: string;
  customerName: string;
  customerNameBn: string;
  location: string;
  locationBn: string;
  purchasedItem: string;
  rating: number;
  comment: string;
  commentBn: string;
  verifiedDate: string;
}

export interface SiteSettings {
  websiteName: string;
  websiteNameBn: string;
  logoUrl: string; // Empty string uses default Maa Lakshmi Alankar heritage emblem; Admin can upload official PNG/SVG/JPG
  tagline: string;
  taglineBn: string;
  contactPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  showroomAddress: string;
  showroomAddressBn: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  insideDhakaDelivery: number;
  outsideDhakaDelivery: number;
  freeDeliveryThreshold: number;
  announcementText: string;
  announcementTextBn: string;
  announcementEnabled: boolean;
  heroTitle: string;
  heroTitleBn: string;
  heroSubtitle: string;
  heroSubtitleBn: string;
  heroCtaText: string;
  heroCtaTextBn: string;
  heroBannerImage: string;
  specialOfferTitle: string;
  specialOfferTitleBn: string;
  specialOfferSubtitle: string;
  specialOfferSubtitleBn: string;
  specialOfferBadge: string;
  specialOfferBannerImage: string;
  websiteDescription: string;
  websiteDescriptionBn: string;
  seoMetaTitle: string;
  seoMetaDescription: string;
  seoKeywords: string;
  metaPixelId: string;
  metaPixelEnabled: boolean;
  ga4MeasurementId: string;
  ga4Enabled: boolean;
}

export interface AdminDashboardStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalSales: number;
  totalProducts: number;
  lowStockProducts: number;
}
