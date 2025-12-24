import Account from './pages/Account';
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
import ProfileSetup from './pages/ProfileSetup';
import AdminProducts from './pages/AdminProducts';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Account": Account,
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
    "ProfileSetup": ProfileSetup,
    "AdminProducts": AdminProducts,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};