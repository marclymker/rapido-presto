import Account from './pages/Account';
import AdminProducts from './pages/AdminProducts';
import AdminShops from './pages/AdminShops';
import AdminValidation from './pages/AdminValidation';
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
import ProfileSetup from './pages/ProfileSetup';
import Product from './pages/Product';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Account": Account,
    "AdminProducts": AdminProducts,
    "AdminShops": AdminShops,
    "AdminValidation": AdminValidation,
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
    "ProfileSetup": ProfileSetup,
    "Product": Product,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};