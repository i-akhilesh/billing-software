
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
    return (
        <div className="min-h-screen print:min-h-0 print:block bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex font-sans transition-colors duration-200">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen print:min-h-0 print:block overflow-hidden print:overflow-visible">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto print:overflow-visible p-6 print:p-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
