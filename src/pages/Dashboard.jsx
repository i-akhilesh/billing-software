import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import DashboardStats from '../components/DashboardStats';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { Plus, Filter, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';
import RevenueChart from '../components/RevenueChart';
import TopItemsChart from '../components/TopItemsChart';
import DataMigration from '../components/DataMigration';

const Dashboard = () => {
    const { user } = useAuth();
    const { invoices, customers, items, loading, updateInvoice } = useData();
    const { addToast } = useToast();

    // Filter State
    const [dateFilter, setDateFilter] = useState('thisMonth');
    const [customRange, setCustomRange] = useState({
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });

    // Filter Logic
    const { filteredInvoices } = useMemo(() => {
        const now = new Date();
        let start, end;

        switch (dateFilter) {
            case 'thisMonth':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'thisYear':
                start = startOfYear(now);
                end = endOfYear(now);
                break;
            case 'custom':
                start = new Date(customRange.start);
                end = new Date(customRange.end);
                // Adjust end date to end of day to include invoices created on that day
                end.setHours(23, 59, 59, 999);
                break;
            case 'allTime':
            default:
                // For allTime, we just use the original array, but wrapped in object to match return signature if needed
                // Actually, the switch usually sets start/end unless it returns early.
                // Let's keep logic simple:
                return { filteredInvoices: invoices };
        }

        const filteredInvoices = invoices.filter(inv => {
            if (!inv.date) return false;
            const date = parseISO(inv.date);
            return isWithinInterval(date, { start, end });
        });

        return { filteredInvoices };
    }, [invoices, dateFilter, customRange]);

    // Get recent 5 invoices
    const recentInvoices = [...filteredInvoices]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    const getCustomerName = (id) => {
        const customer = (customers || []).find(c => c.id === id);
        return customer ? customer.name : 'Unknown';
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await updateInvoice(id, { status: newStatus });
            addToast('Status updated', 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to update status', 'error');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Paid': return 'bg-green-100 text-green-800';
            case 'Sent': return 'bg-blue-100 text-blue-800';
            case 'Draft': return 'bg-gray-100 text-gray-800';
            case 'Overdue': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center text-gray-500">Loading data...</div>;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-gray-500">Overview of your business</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Filter Controls */}
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-sm text-gray-700"
                        >
                            <option value="thisMonth">This Month</option>
                            <option value="thisYear">This Year</option>
                            <option value="allTime">All Time</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {dateFilter === 'custom' && (
                        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <input
                                type="date"
                                value={customRange.start}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                className="text-sm border-none focus:outline-none w-28"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={customRange.end}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                className="text-sm border-none focus:outline-none w-28"
                            />
                        </div>
                    )}

                    <Link
                        to="/invoices/new"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 justify-center"
                    >
                        <Plus className="h-4 w-4" />
                        New Invoice
                    </Link>
                </div>
            </div>

            {/* Migration Tool (Admin Only) - Added prominent visibility for empty state */}
            {user?.role === 'admin' && (
                <div className="mb-8">
                    <DataMigration />
                </div>
            )}

            {/* Empty State / Welcome Message for Non-Admins or when clean */}
            {invoices.length === 0 && items.length === 0 && customers.length === 0 && user?.role !== 'admin' && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
                    <p className="text-blue-700">
                        Welcome! The database is currently empty.
                        Please ask an administrator to sync data or start adding new customers and items.
                    </p>
                </div>
            )}

            {/* Pass filtered invoices and items to stats */}
            <DashboardStats invoices={filteredInvoices} items={items} />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <RevenueChart invoices={filteredInvoices} />
                <TopItemsChart invoices={filteredInvoices} />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {dateFilter === 'thisMonth' ? 'Invoices (This Month)' :
                            dateFilter === 'thisYear' ? 'Invoices (This Year)' :
                                dateFilter === 'allTime' ? 'Invoices (All Time)' : 'Invoices (Custom)'}
                    </h2>
                    <Link to="/invoices" className="text-blue-600 text-sm hover:underline">View All</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-medium">
                            <tr>
                                <th className="px-6 py-3">Invoice #</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentInvoices.length > 0 ? (
                                recentInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium text-blue-600">
                                            <Link to={`/invoices/${inv.id}`} className="hover:underline">
                                                {inv.invoiceNumber}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-3">
                                            {inv.date ? format(new Date(inv.date), 'MMM dd, yyyy') : '-'}
                                        </td>
                                        <td className="px-6 py-3">
                                            {getCustomerName(inv.customerId)}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-800">
                                            ₹{inv.total?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3">
                                            <select
                                                value={inv.status}
                                                onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                                                className={`px-2 py-1 rounded-full text-xs font-semibold border-none cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none ${getStatusColor(inv.status)}`}
                                            >
                                                <option value="Draft">Draft</option>
                                                <option value="Sent">Sent</option>
                                                <option value="Paid">Paid</option>
                                                <option value="Overdue">Overdue</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No invoices found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
