import Home from './pages/Home';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Account from './pages/Account';
import EnterpriseDashboard from './pages/EnterpriseDashboard';
import DriverDashboard from './pages/DriverDashboard';
import EnterpriseAccount from './pages/EnterpriseAccount';
import DriverAccount from './pages/DriverAccount';
import ProfileSetup from './pages/ProfileSetup';
import ManageProfiles from './pages/ManageProfiles';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Cart": Cart,
    "Orders": Orders,
    "Account": Account,
    "EnterpriseDashboard": EnterpriseDashboard,
    "DriverDashboard": DriverDashboard,
    "EnterpriseAccount": EnterpriseAccount,
    "DriverAccount": DriverAccount,
    "ProfileSetup": ProfileSetup,
    "ManageProfiles": ManageProfiles,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};