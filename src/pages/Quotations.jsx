import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, FileCheck, Eye, Layers, Copy } from 'lucide-react';
import { format } from 'date-fns';

const Quotations = () => {
    const { quotations, invoices, customers, deleteQuotation, addQuotation, loading } = useData();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

    const getCustomerName = (customerId, inlineName) => {
        if (inlineName) return inlineName;
        const customer = (customers || []).find(c => c.id === customerId);
        return customer ? customer.name : 'Unknown Customer';
    };

    const filteredQuotations = (quotations || []).filter(q => {
        const quoteNumMatch = (q.quotationNumber || q.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const custNameMatch = getCustomerName(q.customerId, q.customerName).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = quoteNumMatch || custNameMatch;
        const matchesStatus = filterStatus === 'All' || q.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this quotation?')) {
            try {
                await deleteQuotation(id);
                addToast('Quotation deleted', 'success');
            } catch (err) {
                console.error(err);
                addToast('Failed to delete quotation', 'error');
            }
        }
    };

    const handleConvertInvoiceToQuotation = async () => {
        if (!selectedInvoiceId) {
            addToast('Please select an invoice to convert', 'error');
            return;
        }

        const inv = invoices.find(i => i.id === selectedInvoiceId);
        if (!inv) return;

        try {
            const quoteNumDigits = (inv.invoiceNumber || '').match(/\d+/);
            const quotationNumber = quoteNumDigits ? `QT-${quoteNumDigits[0].padStart(3, '0')}` : `QT-${Date.now().toString().slice(-4)}`;

            const quotationData = {
                quotationNumber,
                date: new Date().toISOString(),
                customerId: inv.customerId || '',
                customerName: getCustomerName(inv.customerId, inv.customerName),
                items: inv.items || [],
                subtotal: inv.subtotal || 0,
                discount: inv.discount || 0,
                taxTotal: inv.taxTotal || 0,
                total: inv.total || 0,
                status: 'Active',
                notes: `Converted from Invoice ${inv.invoiceNumber}`
            };

            const created = await addQuotation(quotationData);
            addToast('Quotation created from invoice!', 'success');
            setIsConvertModalOpen(false);
            navigate(`/quotations/${created.id}`);
        } catch (err) {
            console.error(err);
            addToast('Failed to convert invoice to quotation', 'error');
        }
    };

    if (loading) return <div className="p-8">Loading quotations...</div>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Quotations (3-Set Bids)</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Generate 3 comparative store quotations (+0%, +5%, +10%) for tender orders</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsConvertModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
                    >
                        <Copy className="h-4 w-4" />
                        Convert Invoice to 3 Quotes
                    </button>
                    <Link
                        to="/quotations/new"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        New Quotation
                    </Link>
                </div>
            </div>

            {/* Main Quotations Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 mb-6 transition-colors">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1">
                        <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by quote # or customer name..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Sent">Sent</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Expired">Expired</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium">
                            <tr>
                                <th className="px-6 py-3">Quote #</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Base Price</th>
                                <th className="px-6 py-3">3-Store Bids Range</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredQuotations.length > 0 ? (
                                filteredQuotations.map((q) => {
                                    const baseTotal = parseFloat(q.total) || 0;
                                    const bid5 = Math.round(baseTotal * 1.05);
                                    const bid10 = Math.round(baseTotal * 1.10);

                                    return (
                                        <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-3 font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                                <FileCheck className="h-4 w-4 text-purple-500" />
                                                <Link to={`/quotations/${q.id}`} className="hover:underline font-mono">
                                                    {q.quotationNumber || q.id}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-3">
                                                {q.date ? format(new Date(q.date), 'MMM dd, yyyy') : '-'}
                                            </td>
                                            <td className="px-6 py-3 font-medium text-gray-800 dark:text-white">
                                                {getCustomerName(q.customerId, q.customerName)}
                                            </td>
                                            <td className="px-6 py-3 font-semibold text-green-600 dark:text-green-400">
                                                ₹{baseTotal.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                                                        ₹{baseTotal.toLocaleString()} (0%)
                                                    </span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                                                        ₹{bid5.toLocaleString()} (+5%)
                                                    </span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded">
                                                        ₹{bid10.toLocaleString()} (+10%)
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        to={`/quotations/${q.id}`}
                                                        className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 rounded text-xs flex items-center gap-1 font-medium"
                                                        title="View 3-Store Quotations"
                                                    >
                                                        <Layers className="h-3.5 w-3.5" />
                                                        View 3 Quotes
                                                    </Link>
                                                    <Link
                                                        to={`/quotations/${q.id}/edit`}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(q.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No quotations created yet. Click <strong>New Quotation</strong> or <strong>Convert Invoice to 3 Quotes</strong> to get started!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Convert Invoice Modal */}
            {isConvertModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                <Layers className="h-5 w-5 text-purple-600" />
                                Convert Invoice to 3-Set Quotation
                            </h3>
                            <button onClick={() => setIsConvertModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Select an existing invoice to generate 3 comparative quotations (+0%, +5%, +10% prices for चैतन्य साहित्य भांडार & गुरुकृपा एंटरप्राइजेस).
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Select Invoice
                                </label>
                                <select
                                    value={selectedInvoiceId}
                                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                >
                                    <option value="">-- Choose an Invoice --</option>
                                    {invoices.map(inv => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.invoiceNumber} - {getCustomerName(inv.customerId, inv.customerName)} (₹{inv.total?.toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsConvertModalOpen(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 rounded-md text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConvertInvoiceToQuotation}
                                disabled={!selectedInvoiceId}
                                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm font-medium disabled:opacity-50"
                            >
                                Generate 3 Quotations
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Quotations;
