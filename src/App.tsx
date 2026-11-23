import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { Route, Routes, Outlet, useLocation } from 'react-router-dom'
import { CartProvider } from './store/cart'
import { ShopProvider } from './store/shop'
import { RewardsProvider } from './store/rewards'
import { AssistantProvider } from './store/assistant'
import { ToastProvider } from './store/toast'
import { CustomCursor } from './components/layout/CustomCursor'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { FloatingDock } from './components/layout/FloatingDock'
import { ConsentBanner } from './components/layout/ConsentBanner'
import { CartDrawer } from './components/commerce/CartDrawer'
import { CompareBar } from './components/commerce/CompareBar'
import { CinematicIntro } from './components/intro/CinematicIntro'
import { AdminLayout } from './components/admin/AdminLayout'
import { PageLoader } from './components/ui/PageLoader'
import { trackPageView } from './lib/analytics'
import { isCompactDevice } from './hooks/useCompactDevice'

const Home = lazy(() => import('./pages/Home'))
const Shop = lazy(() => import('./pages/Shop'))
const ProductPage = lazy(() => import('./pages/Product'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const Compare = lazy(() => import('./pages/Compare'))
const Checkout = lazy(() => import('./pages/Checkout'))
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'))
const TrackOrder = lazy(() => import('./pages/TrackOrder'))
const Loyalty = lazy(() => import('./pages/Loyalty'))
const Policies = lazy(() => import('./pages/Policies'))
const NotFound = lazy(() => import('./pages/NotFound'))

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'))
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'))
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'))
const AdminGrowth = lazy(() => import('./pages/admin/AdminGrowth'))
const AdminStockAlerts = lazy(() => import('./pages/admin/AdminStockAlerts'))
const Finance = lazy(() => import('./pages/admin/Finance'))

function introSeen() {
  try {
    // Phones skip the cinematic intro entirely: it is a scroll-driven full-screen
    // canvas animation that costs far more than it adds on a small touch device.
    if (isCompactDevice()) {
      sessionStorage.setItem('sx_intro_seen', '1')
      return true
    }
    return sessionStorage.getItem('sx_intro_seen') === '1'
  } catch {
    return false
  }
}

function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    trackPageView(pathname)
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = decodeURIComponent(hash.replace('#', ''))
    let attempts = 0
    let timer = window.setTimeout(function tryScroll() {
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      attempts += 1
      if (attempts < 25) {
        timer = window.setTimeout(tryScroll, 80)
      }
    }, 60)
    return () => window.clearTimeout(timer)
  }, [pathname, hash])

  return null
}

function SiteLayout() {
  const [introVisible, setIntroVisible] = useState(() => !introSeen())

  const finishIntro = useCallback(() => {
    try {
      sessionStorage.setItem('sx_intro_seen', '1')
    } catch {
      /* sessionStorage may be unavailable */
    }
    setIntroVisible(false)
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col">
      {introVisible && <CinematicIntro onFinish={finishIntro} />}
      <CustomCursor />
      <div className="grain" aria-hidden="true" />
      <Header />
      <CartDrawer />
      <main id="main-content" className="flex-1">
        <Suspense
          fallback={
            <div className="pt-[7rem]">
              <PageLoader label="LOADING EXPERIENCE" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <CompareBar />
      <FloatingDock />
      <ConsentBanner />
      <Footer />
    </div>
  )
}

function AnimatedSiteRoutes() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:slug" element={<ProductPage />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="compare" element={<Compare />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order/:orderNumber" element={<OrderSuccess />} />
        <Route path="track" element={<TrackOrder />} />
        <Route path="loyalty" element={<Loyalty />} />
        <Route path="policies" element={<Policies />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<AdminProductForm />} />
        <Route path="products/:id/edit" element={<AdminProductForm />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="growth" element={<AdminGrowth />} />
        <Route path="finance" element={<Finance />} />
        <Route path="stock-alerts" element={<AdminStockAlerts />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <ShopProvider>
        <RewardsProvider>
          <AssistantProvider>
            <CartProvider>
              <ScrollManager />
              <Suspense
                fallback={
                  <div className="min-h-screen bg-ink">
                    <PageLoader label="LOADING SNEAKERX" />
                  </div>
                }
              >
                <AnimatedSiteRoutes />
              </Suspense>
            </CartProvider>
          </AssistantProvider>
        </RewardsProvider>
      </ShopProvider>
    </ToastProvider>
  )
}
