
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, FileText, Settings, ClipboardList } from 'lucide-react';

const Sidebar = () => {
    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Customers', icon: Users, path: '/customers' },
        { name: 'Items', icon: Package, path: '/items' },
        { name: 'Inventory', icon: ClipboardList, path: '/inventory' },
        { name: 'Invoices', icon: FileText, path: '/invoices' },
    ];

    return (
        <aside className="print:hidden w-64 bg-gray-900 text-white min-h-screen hidden md:block flex-shrink-0">
            <div className="p-6 border-b border-gray-800">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <span className="text-blue-500">Bramha</span>Chaitanya
                </div>
            </div>
            <nav className="mt-6">
                <ul>
                    {navItems.map((item) => (
                        <li key={item.name}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${isActive
                                        ? 'text-blue-400 bg-gray-800 border-r-2 border-blue-400'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`
                                }
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="absolute bottom-0 w-64 p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 px-2 py-3 text-sm font-medium text-gray-400 hover:text-white cursor-pointer">
                    <Settings className="h-5 w-5" />
                    Settings
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
