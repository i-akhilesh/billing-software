import { DollarSign, FileText, CheckCircle, Clock, TrendingDown, TrendingUp, Package } from 'lucide-react';

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

const DashboardStats = ({ invoices, items = [] }) => {
    // Calculate Total Collected and Pending
    const { totalCollected, pendingAmount } = invoices.reduce((acc, inv) => {
        const total = parseFloat(inv.total) || 0;
        const paidViaPayments = (inv.payments || []).reduce((pSum, p) => pSum + (parseFloat(p.amount) || 0), 0);

        let paid = paidViaPayments;

        // Fallback: If status is 'Paid' but no payments recorded, assume full amount is paid
        // This handles legacy data or manual status updates
        if (inv.status === 'Paid' && paid < total) {
            paid = total;
        }

        acc.totalCollected += paid;
        acc.pendingAmount += Math.max(0, total - paid);

        return acc;
    }, { totalCollected: 0, pendingAmount: 0 });

    const activeItemsCount = (items || []).filter(i => i.status === 'active').length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
                title="Total Revenue"
                value={`₹${totalCollected.toLocaleString()}`}
                icon={DollarSign}
                colorClass="bg-green-500"
            />
            <StatCard
                title="Total Invoices"
                value={invoices.length}
                icon={FileText}
                colorClass="bg-blue-500"
            />
            <StatCard
                title="Active Products"
                value={activeItemsCount}
                icon={Package}
                colorClass="bg-indigo-500"
            />
            <StatCard
                title="Pending Amount"
                value={`₹${pendingAmount.toLocaleString()}`}
                icon={Clock}
                colorClass="bg-yellow-500"
            />
        </div>
    );
};

export default DashboardStats;
