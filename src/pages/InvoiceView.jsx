
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Download, Printer, Share2, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import PaymentModal from '../components/PaymentModal';

const numberToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : '';
    return str === '' ? 'Zero Only' : str.trim();
};

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

    const handleDownloadPDF = async () => {
        const element = invoiceRef.current;
        if (!element) return;
        
        try {
            // Wait for fonts
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('invoice-content');
                    if (el) {
                        el.style.boxShadow = 'none';
                        
                        // Hide the payment summary section in the PDF download
                        const paymentSummary = el.querySelector('.payment-summary-section');
                        if (paymentSummary) {
                            paymentSummary.style.display = 'none';
                        }

                        // Force override all color variables to avoid oklch crash
                        const style = clonedDoc.createElement('style');
                        style.innerHTML = `
                            :root, * {
                                --color-gray-900: #111827 !important;
                                --color-gray-800: #1f2937 !important;
                                --color-gray-700: #374151 !important;
                                --color-gray-600: #4b5563 !important;
                                --color-gray-500: #6b7280 !important;
                                --color-gray-400: #9ca3af !important;
                                --color-gray-300: #d1d5db !important;
                                --color-gray-200: #e5e7eb !important;
                                --color-gray-100: #f3f4f6 !important;
                                --color-gray-50: #f9fafb !important;
                                --color-blue-900: #1e3a8a !important;
                                --color-blue-800: #1e40af !important;
                                --color-blue-700: #1d4ed8 !important;
                                --color-blue-600: #2563eb !important;
                                --color-blue-500: #3b82f6 !important;
                                --color-amber-600: #d97706 !important;
                                --color-green-600: #16a34a !important;
                                --color-white: #ffffff !important;
                                color: inherit;
                                border-color: inherit;
                                background-color: inherit;
                            }
                        `;
                        clonedDoc.head.appendChild(style);
                    }
                }
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
            
            addToast('PDF downloaded successfully', 'success');
        } catch (error) {
            console.error('Error generating PDF', error);
            addToast(`Failed to generate PDF: ${error.message || String(error)}`, 'error');
        }
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
        <div className="max-w-4xl mx-auto mb-10 print:mb-0">
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

                    <button
                        onClick={handleDownloadPDF}
                        className="bg-[#2563eb] text-white px-4 py-2 rounded-md hover:bg-[#1d4ed8] flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Download PDF
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg overflow-hidden border border-[#f3f4f6]" ref={invoiceRef} id="invoice-content">
                <div className="p-8 print:p-0">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8 print:mb-4 border-b border-[#f3f4f6] pb-8 print:pb-4">
                        <div>
                            <div className="text-2xl font-bold text-[#2563eb] mb-2">Shri Bramachaitanya Enterprises</div>
                            <p className="text-[#6b7280] text-sm">
                                N-11, B 19/4, Subhashchandra Bose Nagar,<br />
                                Hudco, Chh. Sambhaji Nagar, 431003<br />
                                GSTIN: 27AWRPP6364M1ZI<br />
                                Unique Code: VAMHAU00097869<br />
                                Phone: +91 81809 19544
                            </p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-light text-[#1f2937] mb-1">INVOICE</h2>
                            <div className="text-[#2563eb] font-bold text-sm mb-1">Composition Scheme</div>
                            <div className="text-[#d97706] text-xs italic max-w-[200px] ml-auto mb-2 leading-tight">
                                Composition dealer is not eligible to collect tax on supply
                            </div>
                            <p className="text-[#4b5563] font-medium"># {invoice.invoiceNumber}</p>
                            <div className="mt-4 text-sm text-[#6b7280]">
                                <div><span className="font-medium text-[#374151]">Date:</span> {format(new Date(invoice.date), 'MMM dd, yyyy')}</div>
                            </div>
                        </div>
                    </div>

                    {/* Addresses */}
                    <div className="flex justify-between mb-8 print:mb-4">
                        <div>
                            <h3 className="text-[#6b7280] text-xs font-bold uppercase tracking-wider mb-2">Bill To:</h3>
                            <div className="text-[#1f2937] font-medium">{customer.name}</div>
                            <div className="text-[#4b5563] text-sm whitespace-pre-line mt-1">{customer.address || "No address provided"}</div>
                            {customer.gstin && <div className="text-[#4b5563] text-sm mt-1">GSTIN: {customer.gstin}</div>}
                        </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full text-left text-sm mb-6 print:mb-2">
                        <thead className="bg-[#f9fafb] text-[#374151] font-medium border-y border-[#e5e7eb]">
                            <tr>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3 text-center">Qty</th>
                                <th className="px-4 py-3 text-right">Price</th>
                                <th className="px-4 py-3 text-right">Tax</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f3f4f6]">
                            {invoice.items.map((item, index) => {
                                const originalItem = items.find(i => i.id === item.itemId);
                                const itemName = originalItem ? originalItem.name : (item.name || 'Unknown Item');
                                const itemTotal = (parseFloat(item.quantity) * parseFloat(item.price));
                                const itemTax = (itemTotal * (parseFloat(item.taxRate) / 100));

                                return (
                                    <tr key={index}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-[#1f2937]">{itemName}</div>
                                            {item.description && <div className="text-xs text-[#6b7280]">{item.description}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right">₹{parseFloat(item.price).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right">₹{itemTax.toFixed(2)} <span className="text-xs text-[#9ca3af]">({item.taxRate}%)</span></td>
                                        <td className="px-4 py-3 text-right font-medium text-[#111827]">
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
                            <div className="flex justify-end border-t border-[#e5e7eb] pt-4">
                                <div className="w-72 space-y-2">
                                    <div className="flex justify-between text-sm text-[#4b5563]">
                                        <span className="font-medium">Subtotal:</span>
                                        <span>₹{calculatedSubtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-[#4b5563]">
                                        <span className="font-medium">Tax:</span>
                                        <span>₹{calculatedTaxTotal.toFixed(2)}</span>
                                    </div>
                                    {invoice.discount > 0 && (
                                        <div className="flex justify-between text-sm text-[#4b5563]">
                                            <span className="font-medium">Discount:</span>
                                            <span>-₹{parseFloat(invoice.discount).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold text-[#1f2937] border-t border-[#e5e7eb] pt-2 mt-2">
                                        <span>Total:</span>
                                        <span>₹{calculatedTotal.toFixed(2)}</span>
                                    </div>

                                    <div className="text-xs text-[#1d4ed8] font-semibold text-right mt-1">
                                        Rupees {numberToWords(calculatedTotal)}
                                    </div>

                                    {/* Payment Summary */}
                                    <div className="pt-4 mt-4 border-t border-[#f3f4f6] print:hidden payment-summary-section">
                                        <div className="flex justify-between text-sm text-[#16a34a] font-medium">
                                            <span>Paid:</span>
                                            <span>₹{totalPaid.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-base font-bold text-[#2563eb] mt-1">
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

                    {/* Notes and Bank Details */}
                    <div className="mt-12 print:mt-4 flex flex-col md:flex-row justify-between gap-8 print:gap-4 border-t border-[#f3f4f6] pt-8 print:pt-4">
                        <div className="w-full md:w-1/2 bg-[#f9fafb] p-4 rounded-md">
                            <h4 className="font-bold text-[#1d4ed8] text-sm mb-2">Bank Details:</h4>
                            <div className="text-[#4b5563] text-xs space-y-1">
                                <div><span className="font-medium">Bank Name:</span> Bank of Maharashtra</div>
                                <div><span className="font-medium">Account No.:</span> 60410431900</div>
                                <div><span className="font-medium">Branch:</span> Hudco, TV Centre</div>
                                <div><span className="font-medium">IFSC Code:</span> MAHB0001191</div>
                            </div>
                        </div>

                        <div className="w-full md:w-1/2 text-[#6b7280] text-sm">
                            <h4 className="font-medium text-[#374151] mb-1">Terms & Conditions:</h4>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>Interest will be recovered @24% p.a. on overdue unpaid bills.</li>
                                <li>Goods once sold cannot be Returned or Exchanged.</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="mt-8 print:mt-2 pt-4 print:pt-2 border-t border-[#f3f4f6] text-center text-xs text-[#9ca3af]">
                        Generated by BramhaChaitanya Billing System
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
