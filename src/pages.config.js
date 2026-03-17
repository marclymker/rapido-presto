/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Account from './pages/Account';
import AdminBlog from './pages/AdminBlog';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminShops from './pages/AdminShops';
import AdminValidation from './pages/AdminValidation';
import AgentAccount from './pages/AgentAccount';
import AgentClients from './pages/AgentClients';
import AgentCommissions from './pages/AgentCommissions';
import AgentDashboard from './pages/AgentDashboard';
import AllOrdersAdmin from './pages/AllOrdersAdmin';
import Blog from './pages/Blog';
import BlogArticle from './pages/BlogArticle';
import Cart from './pages/Cart';
import CategoryPage from './pages/CategoryPage';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import DriverAccount from './pages/DriverAccount';
import DriverDashboard from './pages/DriverDashboard';
import EnterpriseAccount from './pages/EnterpriseAccount';
import EnterpriseDashboard from './pages/EnterpriseDashboard';
import EventPlannerHaiti from './pages/EventPlannerHaiti';
import Home from './pages/Home';
import ManageProfiles from './pages/ManageProfiles';
import Orders from './pages/Orders';
import PaymentCallback from './pages/PaymentCallback';
import Pricing from './pages/Pricing';
import Product from './pages/Product';
import ProductPage from './pages/ProductPage';
import Products from './pages/Products';
import ProfileSetup from './pages/ProfileSetup';
import RobeDeMariageHaiti from './pages/RobeDeMariageHaiti';
import ShopPage from './pages/ShopPage';
import ShopView from './pages/ShopView';
import TestNotifications from './pages/TestNotifications';
import UpdateProducts from './pages/UpdateProducts';
import WeddingPlannerHaiti from './pages/WeddingPlannerHaiti';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Account": Account,
    "AdminBlog": AdminBlog,
    "AdminDashboard": AdminDashboard,
    "AdminProducts": AdminProducts,
    "AdminShops": AdminShops,
    "AdminValidation": AdminValidation,
    "AgentAccount": AgentAccount,
    "AgentClients": AgentClients,
    "AgentCommissions": AgentCommissions,
    "AgentDashboard": AgentDashboard,
    "AllOrdersAdmin": AllOrdersAdmin,
    "Blog": Blog,
    "BlogArticle": BlogArticle,
    "Cart": Cart,
    "CategoryPage": CategoryPage,
    "Chat": Chat,
    "Dashboard": Dashboard,
    "DriverAccount": DriverAccount,
    "DriverDashboard": DriverDashboard,
    "EnterpriseAccount": EnterpriseAccount,
    "EnterpriseDashboard": EnterpriseDashboard,
    "EventPlannerHaiti": EventPlannerHaiti,
    "Home": Home,
    "ManageProfiles": ManageProfiles,
    "Orders": Orders,
    "PaymentCallback": PaymentCallback,
    "Pricing": Pricing,
    "Product": Product,
    "ProductPage": ProductPage,
    "Products": Products,
    "ProfileSetup": ProfileSetup,
    "RobeDeMariageHaiti": RobeDeMariageHaiti,
    "ShopPage": ShopPage,
    "ShopView": ShopView,
    "TestNotifications": TestNotifications,
    "UpdateProducts": UpdateProducts,
    "WeddingPlannerHaiti": WeddingPlannerHaiti,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};