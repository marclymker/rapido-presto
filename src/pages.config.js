/**
 * pages.config.js - Page routing configuration
 * Lazy-loaded for performance — all pages load on demand only.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const Account = lazy(() => import('./pages/Account'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/AdminProducts'));
const AdminShops = lazy(() => import('./pages/AdminShops'));
const AdminValidation = lazy(() => import('./pages/AdminValidation'));
const AgentAccount = lazy(() => import('./pages/AgentAccount'));
const AgentClients = lazy(() => import('./pages/AgentClients'));
const AgentCommissions = lazy(() => import('./pages/AgentCommissions'));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));
const AllOrdersAdmin = lazy(() => import('./pages/AllOrdersAdmin'));
const Cart = lazy(() => import('./pages/Cart'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const Chat = lazy(() => import('./pages/Chat'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DriverAccount = lazy(() => import('./pages/DriverAccount'));
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'));
const EnterpriseAccount = lazy(() => import('./pages/EnterpriseAccount'));
const EnterpriseDashboard = lazy(() => import('./pages/EnterpriseDashboard'));
const EventPlannerHaiti = lazy(() => import('./pages/EventPlannerHaiti'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/login'));
const ManageProfiles = lazy(() => import('./pages/ManageProfiles'));
const Orders = lazy(() => import('./pages/Orders'));
const PaymentCallback = lazy(() => import('./pages/PaymentCallback'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Product = lazy(() => import('./pages/Product'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const Products = lazy(() => import('./pages/Products'));
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'));
const RobeDeMariageHaiti = lazy(() => import('./pages/RobeDeMariageHaiti'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const ShopView = lazy(() => import('./pages/ShopView'));
const TestNotifications = lazy(() => import('./pages/TestNotifications'));
const UpdateProducts = lazy(() => import('./pages/UpdateProducts'));
const WeddingPlannerHaiti = lazy(() => import('./pages/WeddingPlannerHaiti'));

export const PAGES = {
    "Account": Account,
    "AdminDashboard": AdminDashboard,
    "AdminProducts": AdminProducts,
    "AdminShops": AdminShops,
    "AdminValidation": AdminValidation,
    "AgentAccount": AgentAccount,
    "AgentClients": AgentClients,
    "AgentCommissions": AgentCommissions,
    "AgentDashboard": AgentDashboard,
    "AllOrdersAdmin": AllOrdersAdmin,
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
    "Login": Login,
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
};

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};