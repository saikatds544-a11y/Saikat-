# Maa Lakshmi Alankar (মা লক্ষ্মী অলংকার)
## Complete Database, Admin & Netlify Deployment Guide

---

## 1. Architecture Overview

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + React Router (SEO-friendly URLs)
- **Backend / Serverless**:
  - **Local & Full-Stack Node Runtime**: `server.ts` + `src/server/apiRouter.ts`
  - **Netlify Serverless Functions**: `netlify/functions/api.ts` + `netlify.toml`
- **Database, Auth & Media Storage**:
  - **Production Cloud Mode**: Supabase PostgreSQL (`supabase/schema.sql` with strict Row Level Security), Supabase Auth (`admin_profiles`), and Supabase Storage (`jewellery-media` bucket).
  - **Zero-Config Local Persistence Fallback**: Automatically persists products, categories, orders, settings, and uploaded photos to `data/store-db.json` and `public/uploads/` if Supabase environment variables are not yet supplied.

---

## 2. Accessing the Private Admin Dashboard

Normal customers **never** see any Admin link or button anywhere on the storefront.

- **Direct Private URL**: Navigate to `/admin` (e.g., `https://your-domain.com/admin`)
- **Preview Shortcut**: Press `Ctrl + Shift + A` (or `Cmd + Shift + A` on Mac), or type `/admin` into the storefront search bar and press **Enter**.
- **Initial Local Setup Credentials** (change immediately under **Settings → Admin Password & Security** or via environment variables):
  - **Email**: `admin@maalakshmialankar.com`
  - **Password**: `MaaLakshmi@2026` (or the value set in `ADMIN_DEFAULT_PASSWORD`)

Once signed in, you can:
1. Upload your official **Maa Lakshmi Alankar** brand logo under **Settings, Pixel & SEO → Brand Identity & Official Logo**.
2. Add, edit, or delete jewellery products, upload multiple photos from phone or computer, set regular/discount BDT (`৳`) prices, variations, and stock.
3. View all customer Cash on Delivery orders, phone numbers, and full Bangladesh delivery addresses, and update statuses (`Pending`, `Confirmed`, `Processing`, `Shipped`, `Delivered`, `Cancelled`).
4. Manage Inside Dhaka (`৳80`) & Outside Dhaka (`৳150`) delivery charges, Hero & Special Offer banners, **Meta Facebook Pixel**, and **Google Analytics 4**.

---

## 3. Supabase Setup Instructions (PostgreSQL + Auth + Storage + RLS)

1. Create a new project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase Dashboard and paste the entire contents of `supabase/schema.sql`, then click **Run**.
   - This creates `admin_profiles`, `categories`, `products`, `orders`, `site_settings`, the `jewellery-media` public storage bucket, indexes, and strict Row Level Security (RLS) policies.
3. **Create Your Authorized Admin User**:
   - In Supabase Dashboard → **Authentication → Users**, click **Add User → Create New User** with your admin email and strong password.
   - Copy that user's **User UID** and register them in `admin_profiles` via SQL Editor:
     ```sql
     insert into public.admin_profiles (id, email, role)
     values ('YOUR-USER-UUID-HERE', 'your-admin@email.com', 'super_admin');
     ```
4. Copy your project credentials from **Project Settings → API**:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (**Server-side only — never expose in `VITE_*` variables!**)

---

## 4. Deploying to Netlify

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Log in to [Netlify](https://app.netlify.com) and click **Add new site → Import an existing project**.
3. Netlify automatically detects `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
4. Navigate to **Site Configuration → Environment Variables** in Netlify and add:
   - `APP_URL` = `https://your-site-name.netlify.app`
   - `VITE_SUPABASE_URL` = `https://xxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-supabase-anon-key`
   - `SUPABASE_SERVICE_ROLE_KEY` = `your-supabase-service-role-secret`
   - `ADMIN_JWT_SECRET` = `a-long-random-64-character-secret-string`
   - `META_CAPI_ACCESS_TOKEN` = *(Optional: Meta Conversions API server token for server-side Purchase events)*
5. Click **Deploy site**.

---

## 5. Configuring Meta Pixel & Google Analytics 4

1. Sign in to `/admin` → **Settings, Pixel & SEO**.
2. **Meta Pixel**:
   - Enter your **Meta Pixel ID** and toggle **Enable Pixel**.
   - Automatically tracks `PageView`, `ViewContent`, `Search`, `AddToCart`, `InitiateCheckout`, and `Purchase` (with BDT values & SKUs).
3. **Google Analytics 4**:
   - Enter your **GA4 Measurement ID** (`G-XXXXXXXXXX`) and toggle **Enable GA4**.
   - Automatically tracks visitor `page_view` and full GA4 e-commerce funnel events.
