
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Download, Printer, Share2, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from '../components/InvoicePDF';
import PaymentModal from '../components/PaymentModal';

const InvoiceView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { invoices, customers, items } = useData();
    const [invoice, setInvoice] = useState(null);
    const [customer, setCustomer] = useState(null);
    const invoiceRef = useRef();

    useEffect(() => {
        if (invoices.length > 0) {
            const foundInvoice = invoices.find(i => i.id === id);
            if (foundInvoice) {
                setInvoice(foundInvoice);
                const foundCustomer = customers.find(c => c.id === foundInvoice.customerId);
                setCustomer(foundCustomer);
            } else {
                // If loaded but not found, maybe redirect or show error
                // navigate('/invoices'); // Don't redirect immediately to avoid flash if loading
            }
        }
    }, [id, invoices, customers, navigate]);

    const handlePrint = () => {
        window.print();
    };

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const { addPayment } = useData();
    const { addToast } = useToast();

    const handleRecordPayment = async (invoiceId, paymentData) => {
        try {
            await addPayment(invoiceId, paymentData);
            addToast('Payment recorded successfully', 'success');
            // Refresh logic handled by DataContext updates propagating here
        } catch (error) {
            console.error(error);
            addToast('Failed to record payment', 'error');
        }
    };

    if (!invoice || !customer) {
        return <div className="p-8">Loading or Invoice Not Found...</div>;
    }

    // Calculate Payment Stats
    const totalAmount = invoice.items.reduce((sum, item) => sum + (((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)) * (1 + (parseFloat(item.taxRate) || 0) / 100)), 0) - (invoice.discount || 0);
    const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const balanceDue = totalAmount - totalPaid;

    return (
        <div className="max-w-4xl mx-auto mb-10">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link to="/invoices" className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Invoice {invoice.invoiceNumber}
                    </h1>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${invoice.status === 'Paid' ? 'bg-green-100 text-green-800 border-green-200' :
                        invoice.status === 'Partial' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                        {invoice.status}
                    </span>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md flex items-center gap-2"
                        disabled={invoice.status === 'Paid'}
                    >
                        <Banknote className="h-4 w-4" />
                        Record Payment
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                        <Printer className="h-4 w-4" />
                        Print
                    </button>

                    <PDFDownloadLink
                        document={<InvoicePDF invoice={invoice} customer={customer} items={items} />}
                        fileName={`${invoice.invoiceNumber}.pdf`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                        {({ blob, url, loading, error }) => (
                            <>
                                <Download className="h-4 w-4" />
                                {loading ? 'Generating PDF...' : 'Download PDF'}
                            </>
                        )}
                    </PDFDownloadLink>
                </div>
            </div>

            <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100" ref={invoiceRef}>
                <div className="p-8">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-8">
                        <div>
                            <div className="text-2xl font-bold text-blue-600 mb-2">Shri Bramachaitanya Enterprises</div>
                            <p className="text-gray-500 text-sm">
                                123, Business Park, Industrial Area<br />
                                Pune, Maharashtra, 411001<br />
                                GSTIN: 27ABCDE1234F1Z5<br />
                                Phone: +91 98765 43210
                            </p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-light text-gray-800 mb-2">INVOICE</h2>
                            <p className="text-gray-600 font-medium"># {invoice.invoiceNumber}</p>
                            <div className="mt-4 text-sm text-gray-500">
                                <div><span className="font-medium text-gray-700">Date:</span> {format(new Date(invoice.date), 'MMM dd, yyyy')}</div>
                                <div><span className="font-medium text-gray-700">Due Date:</span> {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</div>
                            </div>
                        </div>
                    </div>

                    {/* Addresses */}
                    <div className="flex justify-between mb-8">
                        <div>
                            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Bill To:</h3>
                            <div className="text-gray-800 font-medium">{customer.name}</div>
                            <div className="text-gray-600 text-sm whitespace-pre-line mt-1">{customer.address || "No address provided"}</div>
                            <div className="text-gray-600 text-sm mt-1">{customer.email}</div>
                            {customer.gstin && <div className="text-gray-600 text-sm mt-1">GSTIN: {customer.gstin}</div>}
                        </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full text-left text-sm mb-6">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-y border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3 text-center">Qty</th>
                                <th className="px-4 py-3 text-right">Price</th>
                                <th className="px-4 py-3 text-right">Tax</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {invoice.items.map((item, index) => {
                                const originalItem = items.find(i => i.id === item.itemId);
                                const itemName = originalItem ? originalItem.name : (item.name || 'Unknown Item');
                                const itemTotal = (parseFloat(item.quantity) * parseFloat(item.price));
                                const itemTax = (itemTotal * (parseFloat(item.taxRate) / 100));

                                return (
                                    <tr key={index}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-800">{itemName}</div>
                                            {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right">₹{parseFloat(item.price).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right">₹{itemTax.toFixed(2)} <span className="text-xs text-gray-400">({item.taxRate}%)</span></td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                                            ₹{(itemTotal).toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Totals */}
                    {(() => {
                        const calculatedSubtotal = invoice.items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
                        const calculatedTaxTotal = invoice.items.reduce((sum, item) => sum + (((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)) * ((parseFloat(item.taxRate) || 0) / 100)), 0);
                        const calculatedTotal = calculatedSubtotal + calculatedTaxTotal - (invoice.discount || 0);

                        return (
                            <div className="flex justify-end border-t border-gray-200 pt-4">
                                <div className="w-72 space-y-2">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span className="font-medium">Subtotal:</span>
                                        <span>₹{calculatedSubtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span className="font-medium">Tax:</span>
                                        <span>₹{calculatedTaxTotal.toFixed(2)}</span>
                                    </div>
                                    {invoice.discount > 0 && (
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span className="font-medium">Discount:</span>
                                            <span>-₹{parseFloat(invoice.discount).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold text-gray-800 border-t border-gray-200 pt-2 mt-2">
                                        <span>Total:</span>
                                        <span>₹{calculatedTotal.toFixed(2)}</span>
                                    </div>

                                    {/* Payment Summary */}
                                    <div className="pt-4 mt-4 border-t border-gray-100">
                                        <div className="flex justify-between text-sm text-green-600 font-medium">
                                            <span>Paid:</span>
                                            <span>₹{totalPaid.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-base font-bold text-blue-600 mt-1">
                                            <span>Balance Due:</span>
                                            <span>₹{balanceDue.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Payment History */}
                    {invoice.payments && invoice.payments.length > 0 && (
                        <div className="mt-8 border-t border-gray-100 pt-8 print:hidden">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Payment History</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-700 font-medium">
                                        <tr>
                                            <th className="px-4 py-2">Date</th>
                                            <th className="px-4 py-2">Mode</th>
                                            <th className="px-4 py-2">Reference</th>
                                            <th className="px-4 py-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {invoice.payments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td className="px-4 py-2 text-gray-600">{format(new Date(payment.date), 'MMM dd, yyyy')}</td>
                                                <td className="px-4 py-2 text-gray-800">{payment.mode}</td>
                                                <td className="px-4 py-2 text-gray-500 font-mono text-xs">{payment.reference || '-'}</td>
                                                <td className="px-4 py-2 text-right font-medium text-green-600">₹{parseFloat(payment.amount).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="mt-12 text-gray-500 text-sm">
                        <h4 className="font-medium text-gray-700 mb-1">Terms & Conditions:</h4>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Goods once sold will not be taken back.</li>
                            <li>Interest @ 18% p.a. will be charged on overdue payments.</li>
                            <li>Subject to local jurisdiction.</li>
                        </ul>
                        <div className="mt-8 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
                            Generated by BramhaChaitanya Billing System
                        </div>
                    </div>
                </div>
            </div>

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                invoice={invoice}
                onRecordPayment={handleRecordPayment}
            />
        </div>
    );
};

export default InvoiceView;
