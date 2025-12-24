import Account from './pages/Account';
import AdminValidation from './pages/AdminValidation';
import Cart from './pages/Cart';
import DriverAccount from './pages/DriverAccount';
import EnterpriseAccount from './pages/EnterpriseAccount';
import Home from './pages/Home';
import ManageProfiles from './pages/ManageProfiles';
import ProfileSetup from './pages/ProfileSetup';
import DriverDashboard from './pages/DriverDashboard';
import EnterpriseDashboard from './pages/EnterpriseDashboard';
import Orders from './pages/Orders';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Account": Account,
    "AdminValidation": AdminValidation,
    "Cart": Cart,
    "DriverAccount": DriverAccount,
    "EnterpriseAccount": EnterpriseAccount,
    "Home": Home,
    "ManageProfiles": ManageProfiles,
    "ProfileSetup": ProfileSetup,
    "DriverDashboard": DriverDashboard,
    "EnterpriseDashboard": EnterpriseDashboard,
    "Orders": Orders,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};