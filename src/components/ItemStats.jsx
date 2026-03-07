import { Package, AlertTriangle, TrendingUp, Tag } from 'lucide-react';
import { useMemo } from 'react';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center transition-colors duration-200">
        <div className={`p-3 rounded-full ${colorClass} mr-4`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{value}</h3>
        </div>
    </div>
);

const ItemStats = ({ items, invoices }) => {

    const stats = useMemo(() => {
        if (!items) return { total: 0, active: 0, value: 0 };

        const total = items.length;

        // Active Items (items that are 'active' status)
        const active = items.filter(i => i.status === 'active').length;

        // Low Stock Items (Stock <= MinStock or 5)
        const lowStock = items.filter(i => {
            const stock = parseFloat(i.stock) || 0;
            const min = parseFloat(i.minStock) || 5;
            return stock <= min;
        }).length;

        return { total, active, lowStock };
    }, [items]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
                title="Total Products"
                value={stats.total}
                icon={Package}
                colorClass="bg-blue-500"
            />
            <StatCard
                title="Active Products"
                value={stats.active}
                icon={Tag}
                colorClass="bg-green-500"
            />
            <StatCard
                title="Low Stock Alert"
                value={stats.lowStock}
                icon={AlertTriangle}
                colorClass="bg-orange-500"
            />
        </div>
    );
};

export default ItemStats;
