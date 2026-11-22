import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, errorMessage } from '../../lib/api'
import type { Category } from '../../lib/types'
import { GENDER_LABEL } from '../../lib/constants'
import { cx } from '../../lib/format'
import { useToast } from '../../store/toast'
import {
  AdminDrawer,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  ConfirmDialog,
} from '../../components/admin/ui'
import { Icon } from '../../components/ui/Icon'

type CategoryForm = { name: string; slug: string; gender: 'men' | 'women' | 'unisex' }

const EMPTY_FORM: CategoryForm = { name: '', slug: '', gender: 'unisex' }
const SLUG_PATTERN = /^[a-z0-9-]{2,60}$/

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { toast } = useToast()

  const load = useCallback(() => {
    let active = true
    setLoading(true)
    setError('')
    api.admin
      .categories()
      .then((result) => {
        if (!active) return
        setCategories(result.categories)
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
  }, [])

  useEffect(() => load(), [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return categories
    return categories.filter((category) =>
      [category.name, category.slug, GENDER_LABEL[category.gender] ?? category.gender]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [categories, search])

  const summary = useMemo(
    () => ({
      total: categories.length,
      used: categories.filter((category) => category.productCount > 0).length,
      products: categories.reduce((sum, category) => sum + category.productCount, 0),
    }),
    [categories],
  )

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    setForm({
      name: category.name,
      slug: category.slug,
      gender: (category.gender as CategoryForm['gender']) || 'unisex',
    })
    setFormError('')
    setFormOpen(true)
  }

  const closeForm = () => {
    if (saving) return
    setFormOpen(false)
    setEditing(null)
    setFormError('')
  }

  const generateSlug = () => {
    const generated = slugify(form.name)
    if (!generated) {
      setFormError('لا يمكن توليد slug من اسم عربي — اكتبه يدويًا بحروف إنجليزية.')
      return
    }
    setForm((current) => ({ ...current, slug: generated }))
    setFormError('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const name = form.name.trim()
    const slug = form.slug.trim().toLowerCase()
    if (name.length < 2) {
      setFormError('اسم التصنيف مطلوب (حرفان على الأقل)')
      return
    }
    if (!SLUG_PATTERN.test(slug)) {
      setFormError('الـ slug يجب أن يكون بحروف إنجليزية صغيرة وأرقام وشرطات (2—60 حرفًا)')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (editing) {
        await api.admin.updateCategory(editing.id, { name, slug, gender: form.gender })
        setCategories((current) =>
          current.map((category) =>
            category.id === editing.id ? { ...category, name, slug, gender: form.gender } : category,
          ),
        )
        toast('تم تحديث التصنيف')
      } else {
        const result = await api.admin.createCategory({ name, slug, gender: form.gender })
        setCategories((current) => [
          ...current,
          { id: result.id, name, slug, gender: form.gender, productCount: 0 },
        ])
        toast('تم إنشاء التصنيف')
      }
      setFormOpen(false)
      setEditing(null)
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.admin.deleteCategory(deleteTarget.id)
      setCategories((current) => current.filter((category) => category.id !== deleteTarget.id))
      toast(`تم حذف ${deleteTarget.name}`)
      setDeleteTarget(null)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading && categories.length === 0) return <AdminLoading label="LOADING CATEGORIES" />
  if (error && categories.length === 0) return <AdminError message={error} onRetry={load} />

  return (
    <div>
      <AdminPageHeader
        eyebrow="CATALOG / CATEGORIES"
        title="التصنيفات"
        description="نظّم الكتالوج في مجموعات واضحة. لا يمكن حذف تصنيف مرتبط بمنتجات حتى تنقل منتجاته أو تحذفها."
        actions={
          <>
            <div className="relative">
              <Icon
                name="search"
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="بحث في التصنيفات..."
                className="field h-9 w-48 !py-1.5 pe-9 ps-3 text-xs"
                aria-label="بحث في التصنيفات"
              />
            </div>
            <button type="button" onClick={openCreate} className="btn btn-volt btn-sm">
              <Icon name="plus" size={14} />
              تصنيف جديد
            </button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'إجمالي التصنيفات', value: summary.total },
          { label: 'تصنيفات مستخدمة', value: summary.used },
          { label: 'منتجات مرتبطة', value: summary.products },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-line bg-ink2 px-4 py-3"
          >
            <span className="text-[10px] text-muted">{item.label}</span>
            <span className="font-mono text-lg">{item.value}</span>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty
          icon="tag"
          title={search ? 'لا توجد تصنيفات مطابقة' : 'لا توجد تصنيفات بعد'}
          message={
            search
              ? 'جرّب كلمة بحث أخرى أو امسح البحث.'
              : 'أنشئ تصنيفًا أولًا لتجميع المنتجات في المتجر.'
          }
          action={
            search ? (
              <button type="button" onClick={() => setSearch('')} className="btn btn-ghost btn-sm">
                مسح البحث
              </button>
            ) : (
              <button type="button" onClick={openCreate} className="btn btn-volt btn-sm">
                <Icon name="plus" size={13} />
                إضافة تصنيف
              </button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-ink2">
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[720px]">
              <thead>
                <tr>
                  <th>التصنيف</th>
                  <th>الـ slug</th>
                  <th>الفئة</th>
                  <th>المنتجات</th>
                  <th className="text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink3 text-muted">
                          <Icon name="tag" size={15} />
                        </span>
                        <span className="text-xs font-semibold">{category.name}</span>
                      </div>
                    </td>
                    <td className="font-mono text-[10px] text-muted" dir="ltr">
                      /{category.slug}
                    </td>
                    <td>
                      <span className="rounded-full border border-line px-2 py-0.5 text-[9px] text-bone/70">
                        {GENDER_LABEL[category.gender] ?? category.gender}
                      </span>
                    </td>
                    <td>
                      <span
                        className={cx(
                          'rounded-full px-2 py-0.5 font-mono text-[10px]',
                          category.productCount > 0
                            ? 'bg-volt/10 text-volt'
                            : 'bg-ink3 text-muted',
                        )}
                      >
                        {category.productCount}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          className="icon-btn !h-8 !w-8"
                          aria-label={`تعديل ${category.name}`}
                          title="تعديل"
                        >
                          <Icon name="edit" size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(category)}
                          className="icon-btn !h-8 !w-8 hover:!border-flare/40 hover:!text-flare"
                          aria-label={`حذف ${category.name}`}
                          title="حذف"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminDrawer
        open={formOpen}
        title={editing ? 'تعديل التصنيف' : 'تصنيف جديد'}
        subtitle={editing ? 'EDIT CATEGORY' : 'NEW CATEGORY'}
        onClose={closeForm}
        footer={
          <div className="flex gap-2">
            <button
              type="submit"
              form="category-form"
              disabled={saving}
              className="btn btn-volt flex-1 btn-sm"
            >
              {saving ? <span className="spinner" /> : <Icon name="check" size={13} />}
              {saving ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إنشاء التصنيف'}
            </button>
            <button type="button" onClick={closeForm} disabled={saving} className="btn btn-ghost flex-1 btn-sm">
              إلغاء
            </button>
          </div>
        }
      >
        <form id="category-form" onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label htmlFor="category-name" className="label">
              اسم التصنيف <span className="text-flare">*</span>
            </label>
            <input
              id="category-name"
              value={form.name}
              onChange={(event) => {
                setForm((current) => ({ ...current, name: event.target.value }))
                setFormError('')
              }}
              placeholder="Running / Lifestyle / Court"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="category-slug" className="label">
              الـ slug <span className="text-flare">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="category-slug"
                value={form.slug}
                onChange={(event) => {
                  setForm((current) => ({ ...current, slug: event.target.value }))
                  setFormError('')
                }}
                placeholder="running"
                className="field min-w-0 font-mono text-sm"
                dir="ltr"
              />
              <button type="button" onClick={generateSlug} className="btn btn-ghost btn-sm shrink-0">
                توليد
              </button>
            </div>
            <p className="mt-1.5 text-[9px] leading-4 text-muted">
              يظهر في روابط المتجر بصيغة <span className="font-mono">/shop?category=slug</span>.
            </p>
          </div>
          <div>
            <label htmlFor="category-gender" className="label">
              الفئة
            </label>
            <select
              id="category-gender"
              value={form.gender}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  gender: event.target.value as CategoryForm['gender'],
                }))
              }
              className="field"
            >
              <option value="unisex">{GENDER_LABEL.unisex}</option>
              <option value="men">{GENDER_LABEL.men}</option>
              <option value="women">{GENDER_LABEL.women}</option>
            </select>
          </div>

          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-flare/30 bg-flare/[0.06] px-3 py-2.5 text-[11px] leading-5 text-flare">
              <Icon name="cancel" size={13} className="mt-0.5 shrink-0" />
              <p>{formError}</p>
            </div>
          )}

          <div className="rounded-xl border border-line bg-ink/40 p-4 text-[10px] leading-5 text-muted">
            حذف تصنيف مرتبط بمنتجات ممنوع من السيرفر لحماية الكتالوج. انقل المنتجات لتصنيف آخر أولًا من
            صفحة المنتجات.
          </div>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف التصنيف؟"
        message={
          deleteTarget?.productCount
            ? `${deleteTarget.name} مرتبط بـ ${deleteTarget.productCount} منتج. السيرفر سيرفض الحذف حتى تنقل المنتجات أولًا.`
            : `سيتم حذف ${deleteTarget?.name ?? 'التصنيف'} نهائيًا. لا يمكن التراجع.`
        }
        confirmLabel="حذف نهائي"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
