import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, FileText, Eye, Layers } from 'lucide-react';
import { format } from 'date-fns';
import InvoiceStats from '../components/InvoiceStats';

const Invoices = () => {
    const { invoices, customers, deleteInvoice, updateInvoice, addQuotation, loading } = useData();
    const { user } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    const getCustomerName = (id) => {
        const customer = (customers || []).find(c => c.id === id);
        return customer ? (customer.name || 'Unnamed Customer') : 'Unknown';
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

    const filteredInvoices = invoices.filter(inv => {
        const invNumMatch = (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
        const custNameMatch = (getCustomerName(inv.customerId) || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = invNumMatch || custNameMatch;
        const matchesStatus = filterStatus === 'All' || inv.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this invoice?')) {
            await deleteInvoice(id);
            addToast('Invoice deleted', 'success');
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

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
                <Link
                    to="/invoices/new"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New Invoice
                </Link>
            </div>

            <InvoiceStats invoices={filteredInvoices} />

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1">
                        <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by invoice # or customer..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                    </select>
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
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredInvoices.length > 0 ? (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium text-blue-600 flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-gray-400" />
                                            <Link to={`/invoices/${inv.id}`} className="hover:underline">
                                                {inv.invoiceNumber}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-3">
                                            {format(new Date(inv.date), 'MMM dd, yyyy')}
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
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    to={`/invoices/${inv.id}`}
                                                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                                    title="View"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                                <Link
                                                    to={`/invoices/${inv.id}/edit`}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const created = await addQuotation({
                                                                quotationNumber: `QT-${Date.now().toString().slice(-4)}`,
                                                                date: new Date().toISOString(),
                                                                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                                                                customerId: inv.customerId || '',
                                                                customerName: getCustomerName(inv.customerId),
                                                                items: inv.items || [],
                                                                subtotal: inv.subtotal || 0,
                                                                discount: inv.discount || 0,
                                                                taxTotal: inv.taxTotal || 0,
                                                                total: inv.total || 0,
                                                                status: 'Active',
                                                                notes: `Converted from Invoice ${inv.invoiceNumber}`
                                                            });
                                                            addToast('Converted to 3 Quotations set!', 'success');
                                                            navigate(`/quotations/${created.id}`);
                                                        } catch (err) {
                                                            console.error(err);
                                                            addToast('Failed to create quotation', 'error');
                                                        }
                                                    }}
                                                    className="p-1 text-purple-600 hover:bg-purple-50 rounded flex items-center gap-1"
                                                    title="Generate 3 Quotations"
                                                >
                                                    <Layers className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(inv.id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No invoices found.
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

export default Invoices;
