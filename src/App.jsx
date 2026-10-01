import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { TabNavigationProvider } from '@/lib/TabNavigationContext'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { lazy, Suspense } from 'react';

const Products = lazy(() => import('./pages/Products'));
const ProductPageFull = lazy(() => import('./pages/ProductPage'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogArticle = lazy(() => import('./pages/BlogArticle'));
const BlogManager = lazy(() => import('./pages/BlogManager'));
const DossierLookup = lazy(() => import('./pages/DossierLookup'));
const PaymentCallback = lazy(() => import('./pages/PaymentCallback'));
const PayLink = lazy(() => import('./pages/PayLink'));
const QuickCheckout = lazy(() => import('./pages/QuickCheckout'));

const { Pages, Layout } = pagesConfig;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PageTransitionWrapper = ({ children }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        style={{ width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin"></div>
  </div>
);

const InnerRouter = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <PageTransitionWrapper>
        <Routes>
          <Route path="/" element={
            <LayoutWrapper currentPageName="Products">
              <Products />
            </LayoutWrapper>
          } />
          {Object.entries(Pages).map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              }
            />
          ))}
          <Route path="/Blog" element={<LayoutWrapper currentPageName="Blog"><Blog /></LayoutWrapper>} />
          <Route path="/BlogArticle" element={<LayoutWrapper currentPageName="BlogArticle"><BlogArticle /></LayoutWrapper>} />
          <Route path="/BlogManager" element={<LayoutWrapper currentPageName="BlogManager"><BlogManager /></LayoutWrapper>} />
          <Route path="/payment/callback" element={<LayoutWrapper currentPageName="PaymentCallback"><PaymentCallback /></LayoutWrapper>} />
          <Route path="/product/:slug" element={<LayoutWrapper currentPageName="ProductPage"><ProductPageFull /></LayoutWrapper>} />
          <Route path="/About" element={<LayoutWrapper currentPageName="About"><About /></LayoutWrapper>} />
          <Route path="/Contact" element={<LayoutWrapper currentPageName="Contact"><Contact /></LayoutWrapper>} />
          <Route path="/PayLink" element={<PayLink />} />
          <Route path="/DossierLookup" element={<DossierLookup />} />
          <Route path="/QuickCheckout" element={<QuickCheckout />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </PageTransitionWrapper>
    </Suspense>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <TabNavigationProvider>
      <InnerRouter />
    </TabNavigationProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
