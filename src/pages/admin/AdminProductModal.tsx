import React, { useState } from 'react';
import { X, Upload, Trash2, Plus } from 'lucide-react';
import type { Category, Product } from '../../types/store.ts';
import { LuxuryImage } from '../../components/LuxuryImage.tsx';

interface AdminProductModalProps {
  initialProduct: Product | null;
  categories: Category[];
  adminToken: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function AdminProductModal({
  initialProduct,
  categories,
  adminToken,
  onClose,
  onSaved,
}: AdminProductModalProps) {
  const [name, setName] = useState(initialProduct?.name || '');
  const [nameBn, setNameBn] = useState(initialProduct?.nameBn || '');
  const [productCode, setProductCode] = useState(
    initialProduct?.productCode || `MLA-22K-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [category, setCategory] = useState(
    initialProduct?.category || categories[0]?.slug || 'necklace'
  );
  const [regularPrice, setRegularPrice] = useState(
    initialProduct ? String(initialProduct.regularPrice) : ''
  );
  const [discountPrice, setDiscountPrice] = useState(
    initialProduct?.discountPrice ? String(initialProduct.discountPrice) : ''
  );
  const [stockQuantity, setStockQuantity] = useState(
    initialProduct ? String(initialProduct.stockQuantity) : '5'
  );
  const [inStock, setInStock] = useState(initialProduct ? initialProduct.inStock : true);
  const [purity, setPurity] = useState(
    initialProduct?.purity || '22K (916 Hallmarked)'
  );
  const [weightInfo, setWeightInfo] = useState(initialProduct?.weightInfo || '');
  const [variationsText, setVariationsText] = useState(
    initialProduct?.variations?.join(', ') || 'Standard'
  );
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [descriptionBn, setDescriptionBn] = useState(initialProduct?.descriptionBn || '');
  const [images, setImages] = useState<string[]>(initialProduct?.images || []);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(Boolean(initialProduct?.isFeatured));
  const [isBestSeller, setIsBestSeller] = useState(Boolean(initialProduct?.isBestSeller));
  const [isNewArrival, setIsNewArrival] = useState(
    initialProduct ? Boolean(initialProduct.isNewArrival) : true
  );

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setError('');

    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Failed to read image file.'));
          reader.readAsDataURL(file);
        });

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ fileName: file.name, dataUrl }),
        });
        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data.error || 'Image upload failed.');
        }
        uploadedUrls.push(data.url);
      }

      setImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setError(err.message || 'Could not upload image.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddExternalUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    setImages((prev) => [...prev, trimmed]);
    setImageUrlInput('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!regularPrice || Number(regularPrice) <= 0) {
      setError('Please enter a valid Regular Price in BDT.');
      return;
    }

    setSaving(true);
    try {
      const endpoint = initialProduct
        ? `/api/admin/products/${encodeURIComponent(initialProduct.id)}`
        : '/api/admin/products';
      const method = initialProduct ? 'PUT' : 'POST';

      const variations = variationsText
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          nameBn: nameBn.trim(),
          productCode: productCode.trim(),
          category,
          regularPrice: Number(regularPrice),
          discountPrice: discountPrice.trim() ? Number(discountPrice) : null,
          stockQuantity: Number(stockQuantity || 0),
          inStock,
          purity: purity.trim(),
          weightInfo: weightInfo.trim(),
          variations: variations.length > 0 ? variations : ['Standard'],
          description: description.trim(),
          descriptionBn: descriptionBn.trim(),
          images,
          isFeatured,
          isBestSeller,
          isNewArrival,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product.');
      }

      await onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-[#EAE2D3] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE2D3] bg-[#FCFBF8]">
          <h2 className="font-serif-display text-2xl font-semibold text-[#1C1917]">
            {initialProduct ? 'Edit Jewellery Product' : 'Add New Jewellery Product'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#57534E] hover:text-[#1C1917] rounded-lg hover:bg-[#F5EFE6] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Product Name (English) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Kanakchampa 22K Gold Sitahar"
                className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Product Name (বাংলা - Optional)
              </label>
              <input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="যেমন: কনকচাঁপা ২২ ক্যারেট সীতাহার"
                className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>
          </div>

          {/* Code & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Product ID / SKU *
              </label>
              <input
                type="text"
                required
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl bg-white focus:outline-none focus:border-[#9A7024]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name} ({c.nameBn})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prices & Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Regular Price (৳ BDT) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={regularPrice}
                onChange={(e) => setRegularPrice(e.target.value)}
                placeholder="145000"
                className="w-full px-3.5 py-2 text-sm font-tabular border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Discount Price (৳ BDT)
              </label>
              <input
                type="number"
                min="0"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                placeholder="Leave blank if none"
                className="w-full px-3.5 py-2 text-sm font-tabular border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Stock Quantity *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-tabular border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>
          </div>

          {/* Purity, Weight & Variations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Gold Purity / Material
              </label>
              <input
                type="text"
                value={purity}
                onChange={(e) => setPurity(e.target.value)}
                placeholder="22K (916 Hallmarked)"
                className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Weight Specification
              </label>
              <input
                type="text"
                value={weightInfo}
                onChange={(e) => setWeightInfo(e.target.value)}
                placeholder="e.g., 16.40 Grams (1.40 Bhori)"
                className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#44403C] mb-1">
              Product Variations (Comma-separated sizes, lengths, or weights)
            </label>
            <input
              type="text"
              value={variationsText}
              onChange={(e) => setVariationsText(e.target.value)}
              placeholder="e.g., Size 2.4, Size 2.6, Size 2.8"
              className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
            />
          </div>

          {/* Product Images Upload */}
          <div className="space-y-3 p-4 rounded-xl bg-[#FCFBF8] border border-[#EAE2D3]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-[#1C1917]">
                Product Images (Upload from Phone / Computer)
              </label>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-[#1C1917] text-[#FCFBF8] hover:bg-[#9A7024] rounded-lg cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingImage ? 'Uploading...' : 'Upload Photos'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingImage}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Or paste an image URL..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#DFD5C3] rounded-lg focus:outline-none focus:border-[#9A7024]"
              />
              <button
                type="button"
                onClick={handleAddExternalUrl}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#F5EFE6] text-[#1C1917] rounded-lg hover:bg-[#EAE0D0] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add URL</span>
              </button>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-1">
                {images.map((img, i) => (
                  <div
                    key={`${img}-${i}`}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-[#DFD5C3] bg-white"
                  >
                    <LuxuryImage
                      src={img}
                      alt={`Product upload ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setImages((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-md hover:bg-red-700 cursor-pointer"
                      aria-label="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-0 inset-x-0 bg-[#1C1917]/80 text-[#FCFBF8] text-[10px] text-center py-0.5">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collection Flags */}
          <div className="flex flex-wrap gap-5 pt-1 text-xs font-medium text-[#1C1917]">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="rounded accent-[#9A7024]"
              />
              <span>Available In Stock</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded accent-[#9A7024]"
              />
              <span>Featured on Homepage</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isBestSeller}
                onChange={(e) => setIsBestSeller(e.target.checked)}
                className="rounded accent-[#9A7024]"
              />
              <span>Best-Selling Piece</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isNewArrival}
                onChange={(e) => setIsNewArrival(e.target.checked)}
                className="rounded accent-[#9A7024]"
              />
              <span>New Arrival</span>
            </label>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Product Description (English)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe craftsmanship, gold purity, and styling..."
                className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Product Description (বাংলা - Optional)
              </label>
              <textarea
                rows={3}
                value={descriptionBn}
                onChange={(e) => setDescriptionBn(e.target.value)}
                placeholder="অলংকারটির বিবরণ বাংলায় লিখুন..."
                className="w-full px-3.5 py-2 text-sm border border-[#DFD5C3] rounded-xl focus:outline-none focus:border-[#9A7024]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE2D3]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-medium text-[#57534E] bg-[#F5EFE6] hover:bg-[#EAE0D0] rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="px-6 py-2.5 text-xs font-semibold text-[#FCFBF8] bg-[#1C1917] hover:bg-[#9A7024] disabled:opacity-60 rounded-xl cursor-pointer"
            >
              {saving
                ? 'Saving Product...'
                : initialProduct
                ? 'Update Jewellery Product'
                : 'Publish Product to Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
