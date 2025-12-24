import Account from './pages/Account';
import AdminValidation from './pages/AdminValidation';
import Cart from './pages/Cart';
import DriverAccount from './pages/DriverAccount';
import EnterpriseAccount from './pages/EnterpriseAccount';
import Home from './pages/Home';
import ManageProfiles from './pages/ManageProfiles';
import Orders from './pages/Orders';
import ProfileSetup from './pages/ProfileSetup';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Account": Account,
    "AdminValidation": AdminValidation,
    "Cart": Cart,
    "DriverAccount": DriverAccount,
    "EnterpriseAccount": EnterpriseAccount,
    "Home": Home,
    "ManageProfiles": ManageProfiles,
    "Orders": Orders,
    "ProfileSetup": ProfileSetup,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};