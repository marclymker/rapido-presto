import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TAB_ROOTS = {
  products: '/',
  tracking: '/DossierLookup',
  dashboard: '/Dashboard',
  account: '/Account',
};

const TAB_ROUTE_PATTERNS = {
  products: ['/', '/Products', '/product/', '/CategoryPage', '/ShopView', '/ShopPage', '/QuickCheckout'],
  tracking: ['/DossierLookup'],
  dashboard: ['/Dashboard', '/EnterpriseDashboard', '/EnterpriseAccount'],
  account: ['/Account', '/Orders', '/Chat', '/Pricing', '/About', '/Contact', '/Blog', '/BlogArticle'],
};

function detectTabFromPath(pathname) {
  for (const [tabId, patterns] of Object.entries(TAB_ROUTE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pathname === pattern || (pattern.endsWith('/') && pathname.startsWith(pattern))) {
        return tabId;
      }
    }
  }
  return 'products';
}

const TabNavigationContext = createContext(null);

export function TabNavigationProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('products');
  const [tabStacks, setTabStacks] = useState(() => {
    const initial = {};
    for (const tabId of Object.keys(TAB_ROOTS)) {
      initial[tabId] = [TAB_ROOTS[tabId]];
    }
    return initial;
  });
  const prevPathRef = useRef(null);

  useEffect(() => {
    const path = location.pathname;
    const tab = detectTabFromPath(path);

    setActiveTab(tab);

    setTabStacks(prev => {
      const stack = prev[tab] || [TAB_ROOTS[tab]];
      if (stack.length > 0 && stack[stack.length - 1] === path) {
        return prev;
      }
      return { ...prev, [tab]: [...stack, path] };
    });

    prevPathRef.current = path;
  }, [location.pathname]);

  const switchToTab = useCallback((tabId) => {
    const rootPath = TAB_ROOTS[tabId];

    if (tabId === activeTab) {
      setTabStacks(prev => ({ ...prev, [tabId]: [rootPath] }));
      navigate(rootPath, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const stack = tabStacks[tabId] || [rootPath];
      navigate(stack[stack.length - 1]);
    }
  }, [activeTab, tabStacks, navigate]);

  const pushToTab = useCallback((tabId, path) => {
    setTabStacks(prev => {
      const stack = prev[tabId] || [TAB_ROOTS[tabId]];
      if (stack.length > 0 && stack[stack.length - 1] === path) return prev;
      return { ...prev, [tabId]: [...stack, path] };
    });
  }, []);

  return (
    <TabNavigationContext.Provider value={{ activeTab, switchToTab, tabStacks, pushToTab }}>
      {children}
    </TabNavigationContext.Provider>
  );
}

export function useTabNavigation() {
  const ctx = useContext(TabNavigationContext);
  if (!ctx) throw new Error('useTabNavigation must be used within TabNavigationProvider');
  return ctx;
}

export { TAB_ROOTS, detectTabFromPath };
