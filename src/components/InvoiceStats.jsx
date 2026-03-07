import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
        <div className={`p-3 rounded-full ${colorClass} mr-4`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
        </div>
    </div>
);

const InvoiceStats = ({ invoices }) => {
    const totalInvoices = invoices.length;

    // Calculate totals
    const { totalAmount, paidAmount, pendingAmount, overdueAmount } = invoices.reduce((acc, inv) => {
        const total = parseFloat(inv.total) || 0;
        const paidViaPayments = (inv.payments || []).reduce((pSum, p) => pSum + (parseFloat(p.amount) || 0), 0);

        let paid = paidViaPayments;
        // Fallback for legacy "Paid" status
        if (inv.status === 'Paid' && paid < total) {
            paid = total;
        }

        acc.totalAmount += total;
        acc.paidAmount += paid;
        acc.pendingAmount += Math.max(0, total - paid);

        // Overdue logic
        if (inv.status === 'Overdue' || (inv.status !== 'Paid' && new Date(inv.dueDate) < new Date())) {
            acc.overdueAmount += Math.max(0, total - paid);
        }

        return acc;
    }, { totalAmount: 0, paidAmount: 0, pendingAmount: 0, overdueAmount: 0 });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
                title="Total Invoices"
                value={totalInvoices}
                icon={FileText}
                colorClass="bg-blue-500"
            />
            <StatCard
                title="Total Value"
                value={`₹${totalAmount.toLocaleString()}`}
                icon={CheckCircle}
                colorClass="bg-indigo-500"
            />
            <StatCard
                title="Collected Amount"
                value={`₹${paidAmount.toLocaleString()}`}
                icon={CheckCircle}
                colorClass="bg-green-500"
            />
            <StatCard
                title="Pending / Overdue"
                value={`₹${pendingAmount.toLocaleString()}`}
                icon={Clock}
                colorClass="bg-yellow-500"
            />
        </div>
    );
};

export default InvoiceStats;
