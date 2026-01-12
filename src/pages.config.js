import Account from './pages/Account';
import AdminProducts from './pages/AdminProducts';
import AdminShops from './pages/AdminShops';
import AdminValidation from './pages/AdminValidation';
import AllOrdersAdmin from './pages/AllOrdersAdmin';
import Cart from './pages/Cart';
import Chat from './pages/Chat';
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
import AgentDashboard from './pages/AgentDashboard';
import AgentClients from './pages/AgentClients';
import AgentCommissions from './pages/AgentCommissions';
import AgentAccount from './pages/AgentAccount';
import AdminDashboard from './pages/AdminDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Account": Account,
    "AdminProducts": AdminProducts,
    "AdminShops": AdminShops,
    "AdminValidation": AdminValidation,
    "AllOrdersAdmin": AllOrdersAdmin,
    "Cart": Cart,
    "Chat": Chat,
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
    "AgentDashboard": AgentDashboard,
    "AgentClients": AgentClients,
    "AgentCommissions": AgentCommissions,
    "AgentAccount": AgentAccount,
    "AdminDashboard": AdminDashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};