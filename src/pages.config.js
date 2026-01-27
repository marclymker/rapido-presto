import Account from './pages/Account';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminShops from './pages/AdminShops';
import AdminValidation from './pages/AdminValidation';
import AgentAccount from './pages/AgentAccount';
import AgentClients from './pages/AgentClients';
import AgentCommissions from './pages/AgentCommissions';
import AgentDashboard from './pages/AgentDashboard';
import AllOrdersAdmin from './pages/AllOrdersAdmin';
import Cart from './pages/Cart';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import DriverAccount from './pages/DriverAccount';
import DriverDashboard from './pages/DriverDashboard';
import EnterpriseAccount from './pages/EnterpriseAccount';
import EnterpriseDashboard from './pages/EnterpriseDashboard';
import Home from './pages/Home';
import ManageProfiles from './pages/ManageProfiles';
import Orders from './pages/Orders';
import PaymentCallback from './pages/PaymentCallback';
import Pricing from './pages/Pricing';
import Product from './pages/Product';
import Products from './pages/Products';
import ProfileSetup from './pages/ProfileSetup';
import ShopView from './pages/ShopView';
import UpdateProducts from './pages/UpdateProducts';
import Register from './pages/Register';
import __Layout from './Layout.jsx';


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
    "Chat": Chat,
    "Dashboard": Dashboard,
    "DriverAccount": DriverAccount,
    "DriverDashboard": DriverDashboard,
    "EnterpriseAccount": EnterpriseAccount,
    "EnterpriseDashboard": EnterpriseDashboard,
    "Home": Home,
    "ManageProfiles": ManageProfiles,
    "Orders": Orders,
    "PaymentCallback": PaymentCallback,
    "Pricing": Pricing,
    "Product": Product,
    "Products": Products,
    "ProfileSetup": ProfileSetup,
    "ShopView": ShopView,
    "UpdateProducts": UpdateProducts,
    "Register": Register,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};