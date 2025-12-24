import Account from './pages/Account';
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
import AdminShops from './pages/AdminShops';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Account": Account,
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
    "AdminShops": AdminShops,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};