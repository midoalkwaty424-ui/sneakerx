import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import type { Category, ColorOption, Product, ProductInput } from '../../lib/types'
import { GENDER_LABEL, SHOE_SIZES } from '../../lib/constants'
import { cx, discountPercent, formatEGP } from '../../lib/format'
import { useToast } from '../../store/toast'
import { AdminError, AdminLoading, AdminPageHeader } from '../../components/admin/ui'
import { ProductVisual } from '../../components/commerce/ProductVisual'
import { Icon } from '../../components/ui/Icon'

const DEFAULT_COLOR: ColorOption = { name: 'Bone', hex: '#E9E3D3', accent: '#D9FF43' }

type FormState = {
  name: string
  slug: string
  subtitle: string
  description: string
  price: string
  comparePrice: string
  gender: 'men' | 'women' | 'unisex'
  categoryId: string
  featured: boolean
  isNew: boolean
  bestSeller: boolean
  rating: string
  reviewCount: string
  stock: string
  colors: ColorOption[]
  sizes: string[]
  images: string[]
}

function makeEmptyForm(): FormState {
  return {
    name: '',
    slug: '',
    subtitle: '',
    description: '',
    price: '',
    comparePrice: '',
    gender: 'unisex',
    categoryId: '',
    featured: false,
    isNew: true,
    bestSeller: false,
    rating: '4.8',
    reviewCount: '0',
    stock: '5',
    colors: [{ ...DEFAULT_COLOR }],
    sizes: [],
    images: [],
  }
}

function formFromProduct(product: Product): FormState {
  return {
    name: product.name,
    slug: product.slug,
    subtitle: product.subtitle,
    description: product.description,
    price: String(product.price),
    comparePrice: product.comparePrice ? String(product.comparePrice) : '',
    gender: product.gender,
    categoryId: product.category ? String(product.category.id) : '',
    featured: product.featured,
    isNew: product.isNew,
    bestSeller: product.bestSeller,
    rating: String(product.rating),
    reviewCount: String(product.reviewCount),
    stock: '5',
    colors: product.colors.length ? product.colors : [{ ...DEFAULT_COLOR }],
    sizes: product.sizes.map((item) => item.size),
    images: product.images,
  }
}

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export default function AdminProductForm() {
  const { id } = useParams()
  const productId = id ? Number(id) : null
  const isEdit = productId !== null && Number.isFinite(productId)
  const navigate = useNavigate()
  const { toast } = useToast()

  const [form, setForm] = useState<FormState>(makeEmptyForm)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      api.admin.categories(),
      isEdit ? api.admin.product(productId as number) : Promise.resolve(null),
    ])
      .then(([categoryResult, productResult]) => {
        if (!active) return
        setCategories(categoryResult.categories)
        if (productResult) setForm(formFromProduct(productResult.product))
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(errorMessage(err))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isEdit, productId])

  useEffect(() => load(), [load])

  const sizeOptions = useMemo(() => {
    const all = [...new Set([...SHOE_SIZES, ...form.sizes])]
    return all.sort((a, b) => Number(a) - Number(b))
  }, [form.sizes])

  const discount = discountPercent(Number(form.price) || 0, Number(form.comparePrice) || null)

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const updateColor = (index: number, key: keyof ColorOption, value: string) => {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, colorIndex) =>
        colorIndex === index ? { ...color, [key]: value } : color,
      ),
    }))
  }

  const addColor = () => {
    if (form.colors.length >= 8) {
      toast('الحد الأقصى 8 ألوان للمنتج', 'error')
      return
    }
    setForm((current) => ({
      ...current,
      colors: [...current.colors, { name: '', hex: '#E9E3D3', accent: '#D9FF43' }],
    }))
  }

  const removeColor = (index: number) => {
    if (form.colors.length <= 1) return
    setForm((current) => ({
      ...current,
      colors: current.colors.filter((_, colorIndex) => colorIndex !== index),
    }))
  }

  const toggleSize = (size: string) => {
    setForm((current) => ({
      ...current,
      sizes: current.sizes.includes(size)
        ? current.sizes.filter((item) => item !== size)
        : [...current.sizes, size],
    }))
    setFieldErrors((current) => {
      if (!current.sizes) return current
      const next = { ...current }
      delete next.sizes
      return next
    })
  }

  const addImageUrl = () => {
    const url = imageUrl.trim()
    if (!url) return
    if (form.images.length >= 6) {
      toast('الحد الأقصى 6 صور للمنتج', 'error')
      return
    }
    if (!/^(\/|https?:\/\/)/.test(url)) {
      toast('أدخل رابط صورة يبدأ بـ / أو https://', 'error')
      return
    }
    setForm((current) =>
      current.images.includes(url) ? current : { ...current, images: [...current.images, url] },
    )
    setImageUrl('')
  }

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (form.images.length >= 6) {
      toast('الحد الأقصى 6 صور للمنتج', 'error')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setUploading(true)
    try {
      const result = await api.admin.upload(file)
      setForm((current) => ({ ...current, images: [...current.images, result.url] }))
      toast('تم رفع الصورة')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const validate = () => {
    const errors: Record<string, string> = {}
    if (form.name.trim().length < 2) errors.name = 'اسم المنتج مطلوب (حرفان على الأقل)'
    if (form.description.trim().length < 10) errors.description = 'الوصف مطلوب (10 أحرف على الأقل)'
    const price = Number(form.price)
    if (!form.price.trim() || !Number.isFinite(price) || price <= 0) {
      errors.price = 'أدخل سعرًا صحيحًا أكبر من صفر'
    }
    if (form.comparePrice.trim()) {
      const compare = Number(form.comparePrice)
      if (!Number.isFinite(compare) || compare <= 0) {
        errors.comparePrice = 'سعر المقارنة يجب أن يكون رقمًا أكبر من صفر'
      } else if (Number.isFinite(price) && compare <= price) {
        errors.comparePrice = 'سعر المقارنة يجب أن يكون أعلى من سعر البيع'
      }
    }
    if (form.colors.length === 0) errors.colors = 'أضف لونًا واحدًا على الأقل'
    for (const color of form.colors) {
      if (!color.name.trim()) {
        errors.colors = 'كل لون يحتاج اسمًا'
        break
      }
      if (!HEX_PATTERN.test(color.hex) || !HEX_PATTERN.test(color.accent)) {
        errors.colors = 'أكواد الألوان يجب أن تكون بصيغة HEX مثل #D9FF43'
        break
      }
    }
    if (form.sizes.length === 0) errors.sizes = 'اختر مقاسًا واحدًا على الأقل'
    if (form.images.length > 6) errors.images = 'الحد الأقصى 6 صور'
    const stock = Number(form.stock)
    if (!Number.isFinite(stock) || stock < 0) errors.stock = 'المخزون يجب أن يكون صفرًا أو أكثر'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) {
      toast('راجع الحقول المطلوبة قبل الحفظ', 'error')
      return
    }
    setSaving(true)
    const input: ProductInput = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      subtitle: form.subtitle.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      comparePrice: form.comparePrice.trim() ? Number(form.comparePrice) : null,
      gender: form.gender,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      featured: form.featured,
      isNew: form.isNew,
      bestSeller: form.bestSeller,
      rating: Number(form.rating) || 0,
      reviewCount: Number(form.reviewCount) || 0,
      colors: form.colors.map((color) => ({
        ...color,
        name: color.name.trim(),
        hex: color.hex,
        accent: color.accent,
      })),
      sizes: form.sizes,
      images: form.images,
      stock: Number(form.stock) || 0,
    }

    try {
      if (isEdit) {
        await api.admin.updateProduct(productId as number, input)
        toast('تم تحديث المنتج')
      } else {
        await api.admin.createProduct(input)
        toast('تم إنشاء المنتج')
      }
      navigate('/admin/products')
    } catch (err) {
      toast(errorMessage(err), 'error')
      setSaving(false)
    }
  }

  if (loading) return <AdminLoading label={isEdit ? 'LOADING PRODUCT' : 'LOADING FORM'} />
  if (error) return <AdminError message={error} onRetry={load} />

  return (
    <div>
      <AdminPageHeader
        eyebrow={isEdit ? 'CATALOG / EDIT PRODUCT' : 'CATALOG / NEW PRODUCT'}
        title={isEdit ? form.name || 'تعديل منتج' : 'منتج جديد'}
        description={
          isEdit
            ? 'أي تعديل يحفظ مخزون المتغيرات الحالية كما هو. المتغيرات الجديدة تحصل على المخزون المحدد بالأسفل.'
            : 'أضف قطعة جديدة للكتالوج. كل لون × مقاس يُنشئ متغيرًا مستقلًا بمخزون خاص.'
        }
        actions={
          <>
            <Link to="/admin/products" className="btn btn-ghost btn-sm">
              <Icon name="arrow-right" size={14} />
              رجوع
            </Link>
            <button type="submit" form="product-form" disabled={saving} className="btn btn-volt btn-sm">
              {saving ? <span className="spinner" /> : <Icon name="check" size={14} />}
              {saving ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إنشاء المنتج'}
            </button>
          </>
        }
      />

      <form id="product-form" onSubmit={submit} noValidate className="grid items-start gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-line bg-ink2 p-5">
            <div className="mb-5">
              <p className="eyebrow !text-[9px]">BASICS / 01</p>
              <h2 className="mt-1 font-display text-lg font-bold">بيانات المنتج</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="p-name" className="label">
                  اسم المنتج <span className="text-flare">*</span>
                </label>
                <input
                  id="p-name"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  placeholder="X-01 Aero"
                  className="field"
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name && <p className="error-text">{fieldErrors.name}</p>}
              </div>
              <div>
                <label htmlFor="p-slug" className="label">
                  الرابط (slug)
                </label>
                <input
                  id="p-slug"
                  value={form.slug}
                  onChange={(event) => update('slug', event.target.value)}
                  placeholder="x-01-aero"
                  className="field font-mono text-sm"
                  dir="ltr"
                />
                <p className="mt-1.5 text-[9px] leading-4 text-muted">
                  اتركه فارغًا ليُولد تلقائيًا من الاسم الإنجليزي.
                </p>
              </div>
              <div>
                <label htmlFor="p-subtitle" className="label">
                  العنوان الفرعي
                </label>
                <input
                  id="p-subtitle"
                  value={form.subtitle}
                  onChange={(event) => update('subtitle', event.target.value)}
                  placeholder="Nitro Foam / Limited Drop"
                  className="field"
                  maxLength={140}
                />
              </div>
              <div>
                <label htmlFor="p-gender" className="label">
                  الفئة
                </label>
                <select
                  id="p-gender"
                  value={form.gender}
                  onChange={(event) => update('gender', event.target.value as FormState['gender'])}
                  className="field"
                >
                  <option value="unisex">{GENDER_LABEL.unisex}</option>
                  <option value="men">{GENDER_LABEL.men}</option>
                  <option value="women">{GENDER_LABEL.women}</option>
                </select>
              </div>
              <div>
                <label htmlFor="p-category" className="label">
                  التصنيف
                </label>
                <select
                  id="p-category"
                  value={form.categoryId}
                  onChange={(event) => update('categoryId', event.target.value)}
                  className="field"
                >
                  <option value="">بدون تصنيف</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="p-description" className="label">
                  الوصف <span className="text-flare">*</span>
                </label>
                <textarea
                  id="p-description"
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                  placeholder="وصف تفصيلي للخامات، التقنية، والإحساس على القدم..."
                  className="field min-h-[8.5rem] resize-y leading-7"
                  rows={6}
                  aria-invalid={Boolean(fieldErrors.description)}
                />
                {fieldErrors.description && <p className="error-text">{fieldErrors.description}</p>}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-ink2 p-5">
            <div className="mb-5">
              <p className="eyebrow !text-[9px]">PRICING / 02</p>
              <h2 className="mt-1 font-display text-lg font-bold">السعر والتقييم</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="p-price" className="label">
                  سعر البيع (ج.م) <span className="text-flare">*</span>
                </label>
                <input
                  id="p-price"
                  type="number"
                  min="1"
                  step="1"
                  value={form.price}
                  onChange={(event) => update('price', event.target.value)}
                  placeholder="4290"
                  className="field font-mono"
                  dir="ltr"
                  aria-invalid={Boolean(fieldErrors.price)}
                />
                {fieldErrors.price && <p className="error-text">{fieldErrors.price}</p>}
              </div>
              <div>
                <label htmlFor="p-compare" className="label">
                  سعر المقارنة (قبل الخصم)
                </label>
                <input
                  id="p-compare"
                  type="number"
                  min="1"
                  step="1"
                  value={form.comparePrice}
                  onChange={(event) => update('comparePrice', event.target.value)}
                  placeholder="5200"
                  className="field font-mono"
                  dir="ltr"
                  aria-invalid={Boolean(fieldErrors.comparePrice)}
                />
                {fieldErrors.comparePrice ? (
                  <p className="error-text">{fieldErrors.comparePrice}</p>
                ) : (
                  discount > 0 && <p className="mt-1.5 text-[9px] text-volt">خصم {discount}%</p>
                )}
              </div>
              <div>
                <label htmlFor="p-rating" className="label">
                  التقييم (0 — 5)
                </label>
                <input
                  id="p-rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.rating}
                  onChange={(event) => update('rating', event.target.value)}
                  className="field font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label htmlFor="p-reviews" className="label">
                  عدد المراجعات
                </label>
                <input
                  id="p-reviews"
                  type="number"
                  min="0"
                  step="1"
                  value={form.reviewCount}
                  onChange={(event) => update('reviewCount', event.target.value)}
                  className="field font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-ink2 p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow !text-[9px]">COLORS / 03</p>
                <h2 className="mt-1 font-display text-lg font-bold">الألوان</h2>
                <p className="mt-1 text-[10px] text-muted">كل لون يولّد متغيرات مستقلة مع كل مقاس.</p>
              </div>
              <button type="button" onClick={addColor} className="btn btn-ghost btn-sm">
                <Icon name="plus" size={13} />
                إضافة لون
              </button>
            </div>

            <div className="space-y-3">
              {form.colors.map((color, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-line/80 bg-ink/40 p-3 sm:grid-cols-[auto_1fr_auto_auto]"
                >
                  <span
                    className="mt-6 hidden h-8 w-8 shrink-0 rounded-full border border-bone/20 sm:block"
                    style={{ background: color.hex }}
                    aria-hidden="true"
                  />
                  <div>
                    <label htmlFor={`color-name-${index}`} className="mb-1.5 block text-[10px] text-muted">
                      اسم اللون
                    </label>
                    <input
                      id={`color-name-${index}`}
                      value={color.name}
                      onChange={(event) => updateColor(index, 'name', event.target.value)}
                      placeholder="Bone / Volt / Midnight"
                      className="field !py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor={`color-hex-${index}`} className="mb-1.5 block text-[10px] text-muted">
                      اللون الأساسي
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`color-hex-${index}`}
                        type="color"
                        value={HEX_PATTERN.test(color.hex) ? color.hex : '#E9E3D3'}
                        onChange={(event) => updateColor(index, 'hex', event.target.value)}
                        className="h-9 w-10 cursor-pointer rounded-md border border-line bg-ink3"
                        aria-label={`اللون الأساسي ${color.name}`}
                      />
                      <input
                        value={color.hex}
                        onChange={(event) => updateColor(index, 'hex', event.target.value)}
                        className="field w-24 !py-2 font-mono text-[10px] uppercase"
                        dir="ltr"
                        aria-label="كود HEX الأساسي"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`color-accent-${index}`} className="mb-1.5 block text-[10px] text-muted">
                      لون التمييز
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`color-accent-${index}`}
                        type="color"
                        value={HEX_PATTERN.test(color.accent) ? color.accent : '#D9FF43'}
                        onChange={(event) => updateColor(index, 'accent', event.target.value)}
                        className="h-9 w-10 cursor-pointer rounded-md border border-line bg-ink3"
                        aria-label={`لون التمييز ${color.name}`}
                      />
                      <input
                        value={color.accent}
                        onChange={(event) => updateColor(index, 'accent', event.target.value)}
                        className="field w-24 !py-2 font-mono text-[10px] uppercase"
                        dir="ltr"
                        aria-label="كود HEX الثانوي"
                      />
                      {form.colors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColor(index)}
                          className="icon-btn !h-9 !w-9 shrink-0 hover:!border-flare/40 hover:!text-flare"
                          aria-label={`حذف لون ${color.name || index + 1}`}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {fieldErrors.colors && <p className="error-text">{fieldErrors.colors}</p>}
          </section>

          <section className="rounded-xl border border-line bg-ink2 p-5">
            <div className="mb-5">
              <p className="eyebrow !text-[9px]">SIZES / 04</p>
              <h2 className="mt-1 font-display text-lg font-bold">المقاسات المتاحة</h2>
              <p className="mt-1 text-[10px] text-muted">
                سيتم إنشاء متغير لكل لون × مقاس محدد. {form.colors.length * form.sizes.length} متغير
                إجمالي.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((size) => {
                const active = form.sizes.includes(size)
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={cx('chip min-w-[3.2rem] justify-center font-mono', active && 'chip-active')}
                    aria-pressed={active}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
            {fieldErrors.sizes && <p className="error-text">{fieldErrors.sizes}</p>}
          </section>

          <section className="rounded-xl border border-line bg-ink2 p-5">
            <div className="mb-5">
              <p className="eyebrow !text-[9px]">IMAGES / 05</p>
              <h2 className="mt-1 font-display text-lg font-bold">صور المنتج</h2>
              <p className="mt-1 text-[10px] text-muted">
                بدون صور، تظهر صورة منتج حقيقية من الأرشيف كبديل. يمكنك رفع حتى 6 صور.
              </p>
            </div>

            {form.images.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {form.images.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-ink3"
                  >
                    <img
                      src={image}
                      alt={`صورة ${form.name || 'المنتج'} ${index + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {index === 0 && (
                      <span className="absolute right-2 top-2 rounded-full bg-volt px-2 py-0.5 text-[8px] font-semibold text-ink">
                        رئيسية
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          images: current.images.filter((_, imageIndex) => imageIndex !== index),
                        }))
                      }
                      className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink/85 text-flare opacity-0 backdrop-blur transition group-hover:opacity-100"
                      aria-label={`حذف الصورة ${index + 1}`}
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={onFile}
                  className="sr-only"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className={cx(
                    'flex h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-6 text-center transition hover:border-volt/40 hover:bg-volt/[0.03]',
                    (uploading || form.images.length >= 6) && 'pointer-events-none opacity-50',
                  )}
                >
                  {uploading ? <span className="spinner spinner-light" /> : <Icon name="upload" size={20} />}
                  <span className="text-[11px] text-bone/80">
                    {uploading ? 'جارٍ الرفع...' : 'رفع صورة من الجهاز'}
                  </span>
                  <span className="text-[9px] text-muted">JPG / PNG / WebP / AVIF — حتى 4MB</span>
                </label>
              </div>
              <div>
                <label htmlFor="image-url" className="label">
                  أو رابط صورة
                </label>
                <div className="flex gap-2">
                  <input
                    id="image-url"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addImageUrl()
                      }
                    }}
                    placeholder="https://... أو /uploads/..."
                    className="field min-w-0 font-mono text-[11px]"
                    dir="ltr"
                  />
                  <button type="button" onClick={addImageUrl} className="btn btn-ghost btn-sm shrink-0">
                    <Icon name="plus" size={13} />
                    إضافة
                  </button>
                </div>
                <p className="mt-1.5 text-[9px] leading-4 text-muted">
                  الصورة الأولى هي الرئيسية في المتجر.
                </p>
                {fieldErrors.images && <p className="error-text">{fieldErrors.images}</p>}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4 xl:sticky xl:top-[5.5rem]">
          <section className="rounded-xl border border-line bg-ink2 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow !text-[9px]">PREVIEW</p>
                <h2 className="mt-1 font-display text-lg font-bold">معاينة مباشرة</h2>
              </div>
              <Icon name="eye" size={16} className="text-muted" />
            </div>
            <div className="relative overflow-hidden rounded-xl border border-line bg-[radial-gradient(circle_at_50%_35%,rgba(217,255,67,.08),transparent_60%)]">
              <div className="relative aspect-[4/3]">
                <ProductVisual
                  image={form.images[0]}
                  base={form.colors[0]?.hex}
                  accent={form.colors[0]?.accent}
                  alt={form.name || 'معاينة المنتج'}
                  fit="cover"
                  sizes="(min-width: 1280px) 22vw, 92vw"
                  className="h-full w-full"
                  artClassName="h-full w-full p-6"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/10"
                  aria-hidden="true"
                />
              </div>
              {form.isNew && (
                <span className="absolute right-3 top-3 rounded-full bg-volt px-2.5 py-1 text-[9px] font-semibold text-ink">
                  NEW
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="truncate text-sm font-semibold">{form.name || 'اسم المنتج'}</p>
              <p className="mt-1 truncate text-[10px] text-muted">
                {form.subtitle || 'العنوان الفرعي للمنتج'}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-sm">{formatEGP(Number(form.price) || 0)}</span>
                {Number(form.comparePrice) > Number(form.price) && (
                  <span className="font-mono text-[10px] text-muted line-through">
                    {formatEGP(Number(form.comparePrice))}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                {form.colors.map((color, index) => (
                  <span
                    key={index}
                    className="h-3.5 w-3.5 rounded-full border border-bone/25"
                    style={{ background: color.hex }}
                  />
                ))}
                <span className="ms-2 text-[9px] text-muted">
                  {form.colors.length} لون / {form.sizes.length} مقاس
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-ink2 p-5">
            <p className="eyebrow !text-[9px]">VISIBILITY & STOCK</p>
            <h2 className="mt-1 mb-4 font-display text-lg font-bold">النشر والمخزون</h2>
            <div className="space-y-3">
              <ToggleRow
                label="منتج مميز"
                description="يظهر في الهيرو والريل المثبت بالصفحة الرئيسية."
                checked={form.featured}
                onChange={(value) => update('featured', value)}
              />
              <ToggleRow
                label="وصل حديثًا"
                description="يظهر في قسم New Arrivals."
                checked={form.isNew}
                onChange={(value) => update('isNew', value)}
              />
              <ToggleRow
                label="الأكثر مبيعًا"
                description="يظهر في قسم Best Sellers."
                checked={form.bestSeller}
                onChange={(value) => update('bestSeller', value)}
              />
            </div>

            <div className="mt-5 border-t border-line pt-4">
              <label htmlFor="p-stock" className="label">
                {isEdit ? 'مخزون المتغيرات الجديدة' : 'مخزون كل متغير'}
              </label>
              <input
                id="p-stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) => update('stock', event.target.value)}
                className="field font-mono"
                dir="ltr"
                aria-invalid={Boolean(fieldErrors.stock)}
              />
              {fieldErrors.stock && <p className="error-text">{fieldErrors.stock}</p>}
              <p className="mt-2 text-[9px] leading-4 text-muted">
                {isEdit
                  ? 'المتغيرات الموجودة تحتفظ بمخزونها الحالي. عدّل المخزون التفصيلي من صفحة المخزون.'
                  : 'يمكنك تعديل مخزون كل متغير لاحقًا من صفحة المخزون.'}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
              <button type="submit" disabled={saving} className="btn btn-volt w-full">
                {saving ? <span className="spinner" /> : <Icon name="check" size={15} />}
                {saving ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إنشاء المنتج'}
              </button>
              <Link to="/admin/products" className="btn btn-ghost w-full">
                إلغاء
              </Link>
            </div>
          </section>

        </div>
      </form>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-line/70 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-medium">{label}</p>
        <p className="mt-0.5 text-[9px] leading-4 text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          'flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition',
          checked ? 'border-volt bg-volt' : 'border-line bg-ink3',
        )}
      >
        <span
          className={cx(
            'h-4 w-4 rounded-full transition',
            checked ? 'me-auto bg-ink' : 'ms-auto bg-muted',
          )}
        />
      </button>
    </div>
  )
}
