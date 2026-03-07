import { Package, AlertTriangle, DollarSign, Archive } from 'lucide-react';
import { useMemo } from 'react';

const StatCard = ({ title, value, icon: Icon, colorClass, subText }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center transition-colors duration-200">
        <div className={`p-3 rounded-full ${colorClass} mr-4`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{value}</h3>
            {subText && <p className="text-xs text-gray-400 mt-1">{subText}</p>}
        </div>
    </div>
);

const InventoryStats = ({ items }) => {
    const stats = useMemo(() => {
        if (!items) return { totalItems: 0, totalStock: 0, stockValue: 0, lowStock: 0 };

        const totalItems = items.length;

        // Total Stock Quantity & Value
        let totalStock = 0;
        let stockValue = 0;
        let lowStock = 0;

        items.forEach(i => {
            const stock = parseFloat(i.stock) || 0;
            const price = parseFloat(i.price) || 0;
            const min = parseFloat(i.minStock) || 5;

            totalStock += stock;
            stockValue += stock * price;

            if (stock <= min) {
                lowStock++;
            }
        });

        return { totalItems, totalStock, stockValue, lowStock };
    }, [items]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
                title="Total Items"
                value={stats.totalItems}
                icon={Package}
                colorClass="bg-blue-500"
            />
            <StatCard
                title="Total Stock"
                value={stats.totalStock.toLocaleString()}
                icon={Archive}
                colorClass="bg-purple-500"
            />
            <StatCard
                title="Stock Value"
                value={`₹${stats.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={DollarSign}
                colorClass="bg-green-500"
                subText="Estimated value based on price"
            />
            <StatCard
                title="Low Stock Alerts"
                value={stats.lowStock}
                icon={AlertTriangle}
                colorClass="bg-orange-500"
            />
        </div>
    );
};

export default InventoryStats;
