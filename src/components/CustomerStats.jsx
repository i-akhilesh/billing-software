import { Users, UserPlus, FileText, DollarSign } from 'lucide-react';
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

const CustomerStats = ({ customers, invoices }) => {

    const stats = useMemo(() => {
        if (!customers) return { total: 0, new: 0, active: 0, revenue: 0 };

        const total = customers.length;

        // New Customers (This Month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // Assuming customer objects don't have createdAt yet, but if they did:
        // const newCount = customers.filter(c => new Date(c.createdAt) >= startOfMonth).length;
        // For now, let's just use total or a placeholder logic, or default to 0 if no date.
        // Actually, let's skip "New" if we don't have data, or show total.

        // Active Customers (Placed an invoice)
        const activeCustomerIds = new Set(invoices.map(i => i.customerId));
        const active = customers.filter(c => activeCustomerIds.has(c.id)).length;

        // Total Revenue from Customers (sum of all paid invoices)
        const revenue = invoices
            .filter(inv => inv.status === 'Paid')
            .reduce((sum, inv) => sum + (inv.total || 0), 0);

        return { total, active, revenue };
    }, [customers, invoices]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
                title="Total Customers"
                value={stats.total}
                icon={Users}
                colorClass="bg-blue-500"
            />
            <StatCard
                title="Active Customers"
                value={stats.active}
                icon={UserPlus}
                colorClass="bg-green-500"
            />
            <StatCard
                title="Total Revenue"
                value={`₹${stats.revenue.toLocaleString()}`}
                icon={DollarSign}
                colorClass="bg-purple-500"
            />
        </div>
    );
};

export default CustomerStats;
