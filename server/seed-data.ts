import { withColorPhotos } from './color-photos.js'

export type SeedColor = {
  name: string
  hex: string
  accent: string
  image?: string
  images?: string[]
}

export type SeedProduct = {
  slug: string
  name: string
  subtitle: string
  description: string
  price: number
  comparePrice?: number
  gender: 'men' | 'women' | 'unisex'
  category: string
  featured?: boolean
  isNew?: boolean
  bestSeller?: boolean
  rating: number
  reviewCount: number
  colors: SeedColor[]
  images: string[]
  sizes: string[]
  stock: Record<string, number>
  daysAgo: number
}

const VOLT: SeedColor = { name: 'Volt', hex: '#D9FF43', accent: '#0B0D10' }
const BONE: SeedColor = { name: 'Bone', hex: '#E9E3D3', accent: '#1A1E25' }
const OBSIDIAN: SeedColor = { name: 'Obsidian', hex: '#1B1F27', accent: '#D9FF43' }
const EMBER: SeedColor = { name: 'Ember', hex: '#FF5A36', accent: '#131519' }
const ICE: SeedColor = { name: 'Ice', hex: '#A9C7FF', accent: '#101216' }
const CLAY: SeedColor = { name: 'Clay', hex: '#C98A6B', accent: '#F2EFE6' }
const MOSS: SeedColor = { name: 'Moss', hex: '#7C8B5A', accent: '#D9FF43' }
const CHROME: SeedColor = { name: 'Chrome', hex: '#C9CFD6', accent: '#5B8CFF' }

const MEN_SIZES = ['40', '41', '42', '43', '44', '45']
const WOMEN_SIZES = ['36', '37', '38', '39', '40', '41']
const UNI_SIZES = ['38', '39', '40', '41', '42', '43', '44']

const stockMen = { '40': 9, '41': 14, '42': 7, '43': 11, '44': 4, '45': 2 }
const stockWomen = { '36': 5, '37': 10, '38': 12, '39': 6, '40': 3, '41': 2 }
const stockUni = { '38': 6, '39': 9, '40': 12, '41': 8, '42': 5, '43': 3, '44': 2 }

export const seedCategories = [
  { name: 'الجري', slug: 'running', gender: 'unisex' },
  { name: 'كورت', slug: 'court', gender: 'unisex' },
  { name: 'لايف ستايل', slug: 'lifestyle', gender: 'unisex' },
  { name: 'باسكتبول', slug: 'basketball', gender: 'men' },
  { name: 'ترايل', slug: 'trail', gender: 'men' },
]

export const seedProducts: SeedProduct[] = [
  {
    slug: 'x01-aero',
    name: 'X-01 AERO',
    subtitle: 'السرعة في شكلها الخالص',
    description:
      'أول إصدار من مختبر SNEAKERX. نعل أوسط من رغوة النيتروجين يمنحك ارتدادًا حيويًا مع كل خطوة، وطبقة علوية من النسيج الشبكي المنسوج تحافظ على تهوية كاملة. صُمم للركض الصباحي، لكنه يسرق الأنظار في كل مكان آخر.',
    price: 4250,
    comparePrice: 4800,
    gender: 'men',
    category: 'running',
    featured: true,
    isNew: true,
    bestSeller: true,
    rating: 4.9,
    reviewCount: 128,
    colors: withColorPhotos([VOLT, OBSIDIAN, BONE]),
    images: ['/images/products/x01-aero-1.jpg', '/images/products/x01-aero-2.jpg', '/images/products/x01-aero-3.jpg', '/images/products/x01-aero-4.jpg'],
    sizes: MEN_SIZES,
    stock: stockMen,
    daysAgo: 4,
  },
  {
    slug: 'vanta-runner',
    name: 'VANTA RUNNER',
    subtitle: 'خفيف كأنك لا ترتدي شيئًا',
    description:
      'وزن 218 جرام فقط. هيكل أحادي الطبقة من ألياف الكيفلار مع دعائم جانبية تحافظ على ثبات القدم في المنعطفات الحادة. نعل خارجي مطاطي بنقشة هندسية توفر تماسكًا على الأسفلت والبلاط المبلل.',
    price: 3650,
    gender: 'men',
    category: 'running',
    isNew: true,
    bestSeller: true,
    rating: 4.7,
    reviewCount: 86,
    colors: withColorPhotos([OBSIDIAN, ICE, VOLT]),
    images: ['/images/products/vanta-runner-1.jpg', '/images/products/vanta-runner-2.jpg', '/images/products/vanta-runner-3.jpg', '/images/products/vanta-runner-4.jpg'],
    sizes: MEN_SIZES,
    stock: { ...stockMen, '44': 2, '45': 1 },
    daysAgo: 9,
  },
  {
    slug: 'court-900',
    name: 'COURT 9:00',
    subtitle: 'مباراة تبدأ في التاسعة',
    description:
      'حذاء كورت كلاسيكي بروح معاصرة. جلد طبيعي مدبوغ نباتيًا، نعل مطاطي بلون العاج، وتفاصيل مخيطة يدويًا. يناسب الجينز الواسع والبدلة الرسمية بنفس القدر.',
    price: 3250,
    comparePrice: 3600,
    gender: 'unisex',
    category: 'court',
    featured: true,
    isNew: true,
    rating: 4.8,
    reviewCount: 64,
    colors: withColorPhotos([BONE, OBSIDIAN, CLAY]),
    images: ['/images/products/court-900-1.jpg', '/images/products/court-900-2.jpg', '/images/products/court-900-3.jpg', '/images/products/court-900-4.jpg'],
    sizes: UNI_SIZES,
    stock: stockUni,
    daysAgo: 13,
  },
  {
    slug: 'nova-high',
    name: 'NOVA HIGH',
    subtitle: 'ارتفاع لا يمكن تجاهله',
    description:
      'تصميم هاي توب مستوحى من أحذية السلة في التسعينيات، لكن بمواد القرن الحادي والعشرين. ياقة مبطنة عالية تحمي الكاحل، ونعل هوائي مرئي يمنحك ارتدادًا واضحًا عند الهبوط.',
    price: 4750,
    gender: 'men',
    category: 'basketball',
    featured: true,
    rating: 4.6,
    reviewCount: 41,
    colors: withColorPhotos([EMBER, OBSIDIAN, CHROME]),
    images: ['/images/products/nova-high-1.jpg', '/images/products/nova-high-2.jpg', '/images/products/nova-high-3.jpg', '/images/products/nova-high-4.jpg'],
    sizes: MEN_SIZES,
    stock: { ...stockMen, '45': 4 },
    daysAgo: 22,
  },
  {
    slug: 'halo-knit',
    name: 'HALO KNIT',
    subtitle: 'ملامس للقدم كطبقة ثانية',
    description:
      'طبقة علوية محبوكة بالكامل من خيوط معاد تدويرها، تتشكل حول القدم دون أي ضغط. نعل مرن خفيف ووسادة كعب ناعمة، ومظهر أنيق يصلح للعمل والسفر والتنقل اليومي.',
    price: 3450,
    gender: 'women',
    category: 'lifestyle',
    featured: true,
    isNew: true,
    bestSeller: true,
    rating: 4.9,
    reviewCount: 152,
    colors: withColorPhotos([BONE, ICE, CLAY]),
    images: ['/images/products/halo-knit-1.jpg', '/images/products/halo-knit-2.jpg', '/images/products/halo-knit-3.jpg', '/images/products/halo-knit-4.jpg'],
    sizes: WOMEN_SIZES,
    stock: stockWomen,
    daysAgo: 2,
  },
  {
    slug: 'apex-trail',
    name: 'APEX TRAIL',
    subtitle: 'للأماكن التي لا تصلها الطرق',
    description:
      'حذاء ترايل خشن بمظهر حضري. نعل مسنن عميق من مطاط Vibram-style يوفر تماسكًا على الصخور والطين، وطبقة حماية أمامية مقاومة للماء. صُمم للجبال، لكنه يبدو رائعًا في المدينة.',
    price: 4950,
    gender: 'men',
    category: 'trail',
    rating: 4.7,
    reviewCount: 33,
    colors: withColorPhotos([MOSS, OBSIDIAN, EMBER]),
    images: ['/images/products/apex-trail-1.jpg', '/images/products/apex-trail-2.jpg', '/images/products/apex-trail-3.jpg', '/images/products/apex-trail-4.jpg'],
    sizes: MEN_SIZES,
    stock: { ...stockMen, '40': 3, '44': 5 },
    daysAgo: 31,
  },
  {
    slug: 'lumen-flow',
    name: 'LUMEN FLOW',
    subtitle: 'حركة ناعمة، حضور قوي',
    description:
      'حذاء يومي بتصميم انسيابي ونعل مرن متعدد الطبقات. طبقة علوية من الجلد المدبوغ مع ألواح نسيجية للتهوية، وتفاصيل عاكسة للضوء تجعل حضورك مختلفًا في المساء.',
    price: 3150,
    comparePrice: 3550,
    gender: 'women',
    category: 'lifestyle',
    bestSeller: true,
    rating: 4.6,
    reviewCount: 97,
    colors: withColorPhotos([CLAY, BONE, ICE]),
    images: ['/images/products/lumen-flow-1.jpg', '/images/products/lumen-flow-2.jpg', '/images/products/lumen-flow-3.jpg', '/images/products/lumen-flow-4.jpg'],
    sizes: WOMEN_SIZES,
    stock: { ...stockWomen, '41': 1 },
    daysAgo: 17,
  },
  {
    slug: 'static-x',
    name: 'STATIC X',
    subtitle: 'التصميم الذي يشغل الغرفة',
    description:
      'الحذاء الأكثر جرأة في المجموعة. تباين صارخ بين الأسود والجرافيت مع لمسات Volt، ونعل عريض مستقبلي. كل تفصيلة فيه مدروسة لتكون نقطة الارتكاز في إطلالتك.',
    price: 4100,
    gender: 'unisex',
    category: 'court',
    featured: true,
    bestSeller: true,
    rating: 4.9,
    reviewCount: 211,
    colors: withColorPhotos([OBSIDIAN, VOLT, CHROME]),
    images: ['/images/products/static-x-1.jpg', '/images/products/static-x-2.jpg', '/images/products/static-x-3.jpg', '/images/products/static-x-4.jpg'],
    sizes: UNI_SIZES,
    stock: stockUni,
    daysAgo: 40,
  },
  {
    slug: 'orbit-low',
    name: 'ORBIT LOW',
    subtitle: 'مدارك اليومي',
    description:
      'حذاء لو كت خفيف بتصميم نظيف وخطوط دائرية. بطانة ناعمة ورغوة استجابة سريعة، مع حزام خلفي معدني. رفيقك من الصباح حتى آخر المشاوير.',
    price: 3850,
    gender: 'women',
    category: 'lifestyle',
    isNew: true,
    rating: 4.8,
    reviewCount: 59,
    colors: withColorPhotos([BONE, MOSS, ICE]),
    images: ['/images/products/orbit-low-1.jpg', '/images/products/orbit-low-2.jpg', '/images/products/orbit-low-3.jpg', '/images/products/orbit-low-4.jpg'],
    sizes: WOMEN_SIZES,
    stock: { ...stockWomen, '38': 2 },
    daysAgo: 6,
  },
  {
    slug: 'phase-02',
    name: 'PHASE 02',
    subtitle: 'المرحلة الثانية من الحركة',
    description:
      'الإصدار الثاني من منصة Phase، بطبقة علوية مزدوجة تمنح ثباتًا أكبر دون وزن إضافي. نعل مسطح واسع يوزع الضغط، وخطوط رأسية تعطي إحساسًا بالسرعة حتى وأنت واقف.',
    price: 3950,
    gender: 'women',
    category: 'running',
    isNew: true,
    rating: 4.7,
    reviewCount: 38,
    colors: withColorPhotos([ICE, VOLT, OBSIDIAN]),
    images: ['/images/products/phase-02-1.jpg', '/images/products/phase-02-2.jpg', '/images/products/phase-02-3.jpg', '/images/products/phase-02-4.jpg'],
    sizes: WOMEN_SIZES,
    stock: stockWomen,
    daysAgo: 8,
  },
  {
    slug: 'element-90',
    name: 'ELEMENT 90',
    subtitle: 'نوستالجيا بمستقبل',
    description:
      'استعادة لروح التسعينيات بقراءة جديدة: كتل ألوان بسيطة، نعل سميك، وجلد سويدي ناعم. قطعة سهلة التناسخ مع كل شيء في خزانتك، لكنها لا تبدو عادية أبدًا.',
    price: 3500,
    gender: 'unisex',
    category: 'lifestyle',
    bestSeller: true,
    rating: 4.5,
    reviewCount: 73,
    colors: withColorPhotos([BONE, CLAY, OBSIDIAN]),
    images: ['/images/products/element-90-1.jpg', '/images/products/element-90-2.jpg', '/images/products/element-90-3.jpg', '/images/products/element-90-4.jpg'],
    sizes: UNI_SIZES,
    stock: { ...stockUni, '43': 2 },
    daysAgo: 55,
  },
  {
    slug: 'vector-elite',
    name: 'VECTOR ELITE',
    subtitle: 'مبني للملعب، مخدر للشارع',
    description:
      'أعلى نقطة أداء في SNEAKERX. هيكل داعم للكاحل، نعل ثنائي الكثافة للانطلاق السريع، وبطانة تمتص العرق. نسخة محدودة الإنتاج من 300 زوج فقط لكل لون.',
    price: 5250,
    comparePrice: 5900,
    gender: 'men',
    category: 'basketball',
    featured: true,
    rating: 5.0,
    reviewCount: 27,
    colors: withColorPhotos([OBSIDIAN, VOLT, EMBER]),
    images: ['/images/products/vector-elite-1.jpg', '/images/products/vector-elite-2.jpg', '/images/products/vector-elite-3.jpg', '/images/products/vector-elite-4.jpg'],
    sizes: MEN_SIZES,
    stock: { ...stockMen, '41': 5, '45': 1 },
    daysAgo: 20,
  },
]

export type SeedOrder = {
  orderNumber: string
  productSlug: string
  qty: number
  size: string
  daysAgo: number
  status: string
  customer: {
    name: string
    phone: string
    email?: string
    governorate: string
    city: string
    address: string
  }
}

export const seedOrders: SeedOrder[] = [
  {
    orderNumber: 'SX-26-DEMO01',
    productSlug: 'x01-aero',
    qty: 1,
    size: '42',
    daysAgo: 0,
    status: 'pending',
    customer: {
      name: 'أحمد سامي',
      phone: '01012345678',
      email: 'ahmed.samy@example.com',
      governorate: 'القاهرة',
      city: 'المعادي',
      address: '١٢ شارع ٩، المعادي، الدور الثالث، شقة ٧',
    },
  },
  {
    orderNumber: 'SX-26-DEMO02',
    productSlug: 'halo-knit',
    qty: 2,
    size: '38',
    daysAgo: 1,
    status: 'confirmed',
    customer: {
      name: 'مريم خالد',
      phone: '01123456789',
      governorate: 'الإسكندرية',
      city: 'سموحة',
      address: '٤٥ شارع فيكتور إيمانويل، سموحة، أمام محطة القطار',
    },
  },
  {
    orderNumber: 'SX-26-DEMO03',
    productSlug: 'static-x',
    qty: 1,
    size: '41',
    daysAgo: 2,
    status: 'shipped',
    customer: {
      name: 'يوسف عادل',
      phone: '01234567890',
      email: 'youssef@example.com',
      governorate: 'الجيزة',
      city: 'الدقي',
      address: '٨ شارع التحرير، الدقي، برج النيل، الدور الخامس',
    },
  },
  {
    orderNumber: 'SX-26-DEMO04',
    productSlug: 'nova-high',
    qty: 1,
    size: '43',
    daysAgo: 4,
    status: 'delivered',
    customer: {
      name: 'كريم مصطفى',
      phone: '01556789012',
      governorate: 'المنصورة',
      city: 'المنصورة',
      address: '٢٢ شارع الجمهورية، المنصورة، الدور الأول',
    },
  },
  {
    orderNumber: 'SX-26-DEMO05',
    productSlug: 'orbit-low',
    qty: 1,
    size: '37',
    daysAgo: 5,
    status: 'delivered',
    customer: {
      name: 'سلمى حسن',
      phone: '01098765432',
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      address: '٧ شارع عباس العقاد، مدينة نصر، الدور الثامن',
    },
  },
  {
    orderNumber: 'SX-26-DEMO06',
    productSlug: 'vector-elite',
    qty: 1,
    size: '44',
    daysAgo: 7,
    status: 'cancelled',
    customer: {
      name: 'عمر شريف',
      phone: '01112223334',
      governorate: 'طنطا',
      city: 'طنطا',
      address: '١٥ شارع البحر، طنطا، الدور الثاني',
    },
  },
  {
    orderNumber: 'SX-26-DEMO07',
    productSlug: 'court-900',
    qty: 2,
    size: '40',
    daysAgo: 9,
    status: 'delivered',
    customer: {
      name: 'نادين فؤاد',
      phone: '01223334445',
      governorate: 'الجيزة',
      city: 'الشيخ زايد',
      address: 'فيلا ١٢، الحي الأول، الشيخ زايد',
    },
  },
  {
    orderNumber: 'SX-26-DEMO08',
    productSlug: 'vanta-runner',
    qty: 1,
    size: '45',
    daysAgo: 12,
    status: 'delivered',
    customer: {
      name: 'طارق منير',
      phone: '01556667778',
      governorate: 'أسوان',
      city: 'أسوان',
      address: '٣ شارع كورنيش النيل، أسوان، الدور الرابع',
    },
  },
]
