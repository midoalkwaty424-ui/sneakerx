export const FREE_SHIPPING_THRESHOLD = 2500
export const SHIPPING_FEE = 75
export const MAX_QTY_PER_ITEM = 10

export const GENDER_LABEL: Record<string, string> = {
  men: 'رجالي',
  women: 'حريمي',
  unisex: 'للجميع',
}

export const STATUS_LABEL: Record<string, string> = {
  pending: 'قيد المراجعة',
  confirmed: 'تم التأكيد',
  packed: 'تم التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
}

export const STATUS_STEPS = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'] as const

export const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']

export const GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الشرقية',
  'الدقهلية',
  'الغربية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'شمال سيناء',
  'جنوب سيناء',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'الوادي الجديد',
  'مطروح',
]
