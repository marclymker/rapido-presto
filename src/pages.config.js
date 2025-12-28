import Account from './pages/Account';
import AdminProducts from './pages/AdminProducts';
import AdminShops from './pages/AdminShops';
import AdminValidation from './pages/AdminValidation';
import AllOrdersAdmin from './pages/AllOrdersAdmin';
import Cart from './pages/Cart';
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
import Chat from './pages/Chat';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Account": Account,
    "AdminProducts": AdminProducts,
    "AdminShops": AdminShops,
    "AdminValidation": AdminValidation,
    "AllOrdersAdmin": AllOrdersAdmin,
    "Cart": Cart,
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
    "Chat": Chat,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};