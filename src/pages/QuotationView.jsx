import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Download, Printer, Settings, Building2, Layers, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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

const formatQuoteNumber = (num, fallbackId) => {
    const src = num || fallbackId || '';
    const match = String(src).match(/\d+/);
    if (match) {
        return `QT-${match[0].padStart(3, '0')}`;
    }
    return src ? `QT-${src}` : 'QT-001';
};

const QuotationView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { quotations, customers } = useData();
    const { addToast } = useToast();

    const [quotation, setQuotation] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [activeTab, setActiveTab] = useState('store1'); // 'store1', 'store2', 'store3', 'compare'
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

    // 3 Stores Setup
    const [stores, setStores] = useState({
        store1: {
            id: 'store1',
            name: 'Shri Brahmchaitanya Enterprises',
            address: 'N-11, B 19/4, Subhashchandra Bose Nagar, Hudco, Chh. Sambhaji Nagar, 431003',
            phone: '+91 81809 19544',
            gstin: '27AWRPP6364M1ZI',
            uniqueCode: 'VAMHAU00097869',
            bankName: 'Bank of Maharashtra',
            accountNo: '60410431900',
            branch: 'Hudco, TV Centre',
            ifsc: 'MAHB0001191',
            markup: 0,
            badge: 'Base Price (Cheapest Winner Bid)'
        },
        store2: {
            id: 'store2',
            name: 'चैतन्य साहित्य भांडार',
            address: '८८ व्ही. न-९, रंजनवन हाऊसिंग सोसायटी, शरद हॉटेल समोर, छत्रपती संभाजीनगर.',
            phone: '९६७३००९९३५',
            gstin: '',
            bankName: '',
            accountNo: '',
            branch: '',
            ifsc: '',
            markup: 5,
            badge: '+5% Higher Price'
        },
        store3: {
            id: 'store3',
            name: 'गुरुकृपा एंटरप्राइजेस',
            address: 'एन-११, बी- २०/३, हडको, छत्रपती संभाजीनगर.',
            phone: '९६७३०९०९४७',
            gstin: '',
            bankName: '',
            accountNo: '',
            branch: '',
            ifsc: '',
            markup: 10,
            badge: '+10% Highest Price'
        }
    });

    const quotationRef = useRef();

    useEffect(() => {
        if (quotations.length > 0) {
            const foundQuote = quotations.find(q => q.id === id);
            if (foundQuote) {
                setQuotation(foundQuote);
                const foundCust = (customers || []).find(c => c.id === foundQuote.customerId) || {
                    name: foundQuote.customerName || 'Valued Customer',
                    address: 'No address provided',
                    phone: ''
                };
                setCustomer(foundCust);
            }
        }
    }, [id, quotations, customers]);

    const handlePrint = () => {
        window.print();
    };

    const capturePDFForElement = async (element, filename) => {
        if (!element) return;
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                const el = clonedDoc.getElementById('quotation-content');
                if (el) {
                    el.style.boxShadow = 'none';

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
                            --color-[#991b1b]: #991b1b !important;
                            --color-[#7f1d1d]: #7f1d1d !important;
                            --color-[#065f46]: #065f46 !important;
                            --color-[#047857]: #047857 !important;
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
        pdf.save(filename);
    };

    const handleDownloadCurrentPDF = async () => {
        if (activeTab === 'compare') {
            addToast('Please select a specific store tab to download its PDF', 'info');
            return;
        }

        try {
            const currentStoreObj = stores[activeTab];
            const formattedQuoteNo = formatQuoteNumber(quotation?.quotationNumber, quotation?.id);
            const filename = `Quotation_${currentStoreObj.name.replace(/\s+/g, '_')}_${formattedQuoteNo}.pdf`;
            await capturePDFForElement(quotationRef.current, filename);
            addToast('PDF downloaded successfully', 'success');
        } catch (error) {
            console.error('Error generating PDF', error);
            addToast(`Failed to generate PDF: ${error.message || String(error)}`, 'error');
        }
    };

    const handleDownloadAllThreePDFs = async () => {
        try {
            addToast('Generating all 3 store quotation PDFs...', 'info');

            const keys = ['store1', 'store2', 'store3'];
            const formattedQuoteNo = formatQuoteNumber(quotation?.quotationNumber, quotation?.id);
            for (const key of keys) {
                setActiveTab(key);
                await new Promise(r => setTimeout(r, 450));
                const storeObj = stores[key];
                const filename = `Quotation_${storeObj.name.replace(/\s+/g, '_')}_${formattedQuoteNo}.pdf`;
                await capturePDFForElement(quotationRef.current, filename);
                await new Promise(r => setTimeout(r, 450));
            }

            addToast('All 3 quotation PDFs generated and downloaded!', 'success');
        } catch (err) {
            console.error(err);
            addToast('Failed to generate all 3 quotation PDFs', 'error');
        }
    };

    if (!quotation) {
        return <div className="p-8">Loading quotation...</div>;
    }

    const formattedQuoteNo = formatQuoteNumber(quotation.quotationNumber, quotation.id);
    const currentStore = stores[activeTab === 'compare' ? 'store1' : activeTab];
    const currentMarkupFactor = 1 + (currentStore?.markup || 0) / 100;

    let activeSubtotal = 0;
    const activeItems = (quotation.items || []).map(item => {
        const basePrice = parseFloat(item.price) || 0;
        const adjustedPrice = Math.round(basePrice * currentMarkupFactor);
        const qty = parseFloat(item.quantity) || 0;
        const lineTotal = adjustedPrice * qty;
        activeSubtotal += lineTotal;
        return { ...item, adjustedPrice, lineTotal };
    });

    const activeDiscount = parseFloat(quotation.discount) || 0;
    const activeTotal = Math.max(0, activeSubtotal - activeDiscount);

    return (
        <div className="max-w-4xl mx-auto mb-10 print:mb-0">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link to="/quotations" className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            Quotation {formattedQuoteNo}
                        </h1>
                        <p className="text-xs text-gray-500">3 Distinct Store Quotations for Tender Submission</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsVendorModalOpen(true)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-xs font-medium"
                        title="Edit Company Details"
                    >
                        <Settings className="h-4 w-4 text-purple-600" />
                        Edit Vendors (+5% / +10%)
                    </button>

                    <button
                        onClick={handlePrint}
                        className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-xs font-medium"
                    >
                        <Printer className="h-4 w-4" />
                        Print Active Quote
                    </button>

                    <button
                        onClick={handleDownloadCurrentPDF}
                        disabled={activeTab === 'compare'}
                        className="px-3 py-2 bg-[#2563eb] text-white rounded-md hover:bg-[#1d4ed8] flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" />
                        Download Single PDF
                    </button>

                    <button
                        onClick={handleDownloadAllThreePDFs}
                        className="px-3.5 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all hover:scale-105"
                    >
                        <Layers className="h-4 w-4" />
                        Download All 3 PDFs (1-Click)
                    </button>
                </div>
            </div>

            {/* Store Tabs Navigation */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2 print:hidden">
                <button
                    onClick={() => setActiveTab('store1')}
                    className={`px-4 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'store1'
                            ? 'bg-[#2563eb] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    <Building2 className="h-4 w-4" />
                    <span>{stores.store1.name}</span>
                    <span className="bg-blue-800/40 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        Base (0%)
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('store2')}
                    className={`px-4 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'store2'
                            ? 'bg-[#991b1b] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    <Building2 className="h-4 w-4" />
                    <span>{stores.store2.name}</span>
                    <span className="bg-red-900/40 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        +{stores.store2.markup}%
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('store3')}
                    className={`px-4 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'store3'
                            ? 'bg-[#047857] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    <Building2 className="h-4 w-4" />
                    <span>{stores.store3.name}</span>
                    <span className="bg-emerald-900/40 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        +{stores.store3.markup}%
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('compare')}
                    className={`px-4 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 transition-colors ml-auto ${activeTab === 'compare'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-gray-100 text-emerald-700 hover:bg-emerald-50'
                        }`}
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    Side-by-Side 3-Store Comparison Matrix
                </button>
            </div>

            {/* TAB CONTENT: Comparative Matrix View */}
            {activeTab === 'compare' ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                                3-Vendor Comparative Bid Analysis
                            </h2>
                            <p className="text-sm text-gray-500">Side-by-side price markup comparison for client tender submission</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Cheapest Bid Winner: {stores.store1.name}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-700">
                            <thead className="bg-gray-50 text-gray-800 font-semibold border-y border-gray-200">
                                <tr>
                                    <th className="px-4 py-3">Item Description</th>
                                    <th className="px-4 py-3 text-center">Qty</th>
                                    <th className="px-4 py-3 text-right bg-blue-50/50 text-blue-900">
                                        {stores.store1.name} (Base)
                                    </th>
                                    <th className="px-4 py-3 text-right bg-red-50/50 text-red-900">
                                        {stores.store2.name} (+{stores.store2.markup}%)
                                    </th>
                                    <th className="px-4 py-3 text-right bg-emerald-50/50 text-emerald-900">
                                        {stores.store3.name} (+{stores.store3.markup}%)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(quotation.items || []).map((item, idx) => {
                                    const basePrice = parseFloat(item.price) || 0;
                                    const qty = parseFloat(item.quantity) || 0;

                                    const price1 = basePrice;
                                    const total1 = price1 * qty;

                                    const price2 = Math.round(basePrice * (1 + stores.store2.markup / 100));
                                    const total2 = price2 * qty;

                                    const price3 = Math.round(basePrice * (1 + stores.store3.markup / 100));
                                    const total3 = price3 * qty;

                                    return (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{item.name || 'Item'}</td>
                                            <td className="px-4 py-3 text-center font-semibold">{qty}</td>
                                            <td className="px-4 py-3 text-right bg-blue-50/20 font-medium">
                                                ₹{price1.toFixed(2)} <span className="text-gray-400 text-xs">(₹{total1.toFixed(2)})</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-red-50/20 font-medium">
                                                ₹{price2.toFixed(2)} <span className="text-gray-400 text-xs">(₹{total2.toFixed(2)})</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-emerald-50/20 font-medium">
                                                ₹{price3.toFixed(2)} <span className="text-gray-400 text-xs">(₹{total3.toFixed(2)})</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                {(() => {
                                    const baseSubtotal = (quotation.items || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0), 0);
                                    const discount = parseFloat(quotation.discount) || 0;
                                    const grand1 = Math.max(0, baseSubtotal - discount);

                                    const subtotal2 = (quotation.items || []).reduce((sum, item) => sum + Math.round((parseFloat(item.price) || 0) * (1 + stores.store2.markup / 100)) * (parseFloat(item.quantity) || 0), 0);
                                    const grand2 = Math.max(0, subtotal2 - discount);

                                    const subtotal3 = (quotation.items || []).reduce((sum, item) => sum + Math.round((parseFloat(item.price) || 0) * (1 + stores.store3.markup / 100)) * (parseFloat(item.quantity) || 0), 0);
                                    const grand3 = Math.max(0, subtotal3 - discount);

                                    return (
                                        <tr>
                                            <td colSpan="2" className="px-4 py-4 text-base">Grand Total Bid Quote:</td>
                                            <td className="px-4 py-4 text-right text-base text-blue-700 bg-blue-100/50">
                                                ₹{grand1.toFixed(2)}
                                                <div className="text-[10px] text-emerald-600 font-semibold uppercase">✓ Lowest (Order Winner)</div>
                                            </td>
                                            <td className="px-4 py-4 text-right text-base text-red-700 bg-red-100/50">
                                                ₹{grand2.toFixed(2)}
                                                <div className="text-[10px] text-red-600 font-semibold uppercase">+{stores.store2.markup}% Bid</div>
                                            </td>
                                            <td className="px-4 py-4 text-right text-base text-emerald-700 bg-emerald-100/50">
                                                ₹{grand3.toFixed(2)}
                                                <div className="text-[10px] text-emerald-600 font-semibold uppercase">+{stores.store3.markup}% Bid</div>
                                            </td>
                                        </tr>
                                    );
                                })()}
                            </tfoot>
                        </table>
                    </div>
                </div>
            ) : (
                /* TAB CONTENT: Single Quotation Document View with 3 DISTINCT DESIGNS */
                <div className="bg-white rounded-lg overflow-hidden border border-[#f3f4f6]" ref={quotationRef} id="quotation-content">

                    {/* DESIGN 1: STORE 1 (Shri Brahmchaitanya Enterprises - Corporate Blue) */}
                    {activeTab === 'store1' && (
                        <div className="p-8 print:p-0">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-8 print:mb-4 border-b border-[#f3f4f6] pb-8 print:pb-4">
                                <div>
                                    <div className="text-2xl font-bold text-[#2563eb] mb-2">{currentStore.name}</div>
                                    <p className="text-[#6b7280] text-sm whitespace-pre-line leading-relaxed">
                                        {currentStore.address}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-3xl font-light text-[#1f2937] mb-1">QUOTATION</h2>
                                    <p className="text-[#4b5563] font-medium"># {formattedQuoteNo}</p>
                                    <div className="mt-4 text-sm text-[#6b7280]">
                                        <div><span className="font-medium text-[#374151]">Date:</span> {quotation.date ? format(new Date(quotation.date), 'dd-MM-yyyy') : '-'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Bill To */}
                            <div className="flex justify-between mb-8 print:mb-4">
                                <div>
                                    <h3 className="text-[#6b7280] text-xs font-bold uppercase tracking-wider mb-2">Quotation For:</h3>
                                    <div className="text-[#1f2937] font-medium">{customer?.name || quotation.customerName || 'Valued Customer'}</div>
                                    <div className="text-[#4b5563] text-sm whitespace-pre-line mt-1">{customer?.address || "No address provided"}</div>
                                    {customer?.phone && <div className="text-[#4b5563] text-sm mt-1">Phone: {customer.phone}</div>}
                                    {customer?.gstin && <div className="text-[#4b5563] text-sm mt-1">GSTIN: {customer.gstin}</div>}
                                </div>
                            </div>

                            {/* Table */}
                            <table className="w-full text-left text-sm mb-6 print:mb-2">
                                <thead className="bg-[#f9fafb] text-[#374151] font-medium border-y border-[#e5e7eb]">
                                    <tr>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3 text-center">Qty</th>
                                        <th className="px-4 py-3 text-right">Price</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeItems.map((item, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-1.5">
                                                <div className="font-medium text-[#1f2937]">{item.name || 'Item'}</div>
                                            </td>
                                            <td className="px-4 py-1.5 text-center">{item.quantity}</td>
                                            <td className="px-4 py-1.5 text-right">₹{item.adjustedPrice.toFixed(2)}</td>
                                            <td className="px-4 py-1.5 text-right font-medium text-[#111827]">
                                                ₹{item.lineTotal.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* English Special Note & Totals */}
                            <div className="flex justify-between items-start border-t border-[#e5e7eb] pt-6 mt-8 print:mt-4">
                                <div className="w-1/2 p-4 bg-[#f9fafb] rounded-md print:bg-transparent print:p-0">
                                    <div className="text-xs text-[#1d4ed8] font-medium leading-relaxed">
                                        <strong>Special Note:</strong> This official quotation is valid for government / private tenders.
                                    </div>
                                </div>

                                <div className="w-72 space-y-2">
                                    {activeDiscount > 0 && (
                                        <div className="flex justify-between text-sm text-[#4b5563]">
                                            <span className="font-medium">Discount:</span>
                                            <span>-₹{activeDiscount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold text-[#1f2937] border-t border-[#e5e7eb] pt-2 mt-2">
                                        <span>Total:</span>
                                        <span>₹{activeTotal.toFixed(2)}</span>
                                    </div>

                                    <div className="text-xs text-[#1d4ed8] font-semibold text-right mt-1">
                                        Rupees {numberToWords(activeTotal)}
                                    </div>
                                </div>
                            </div>

                            {/* Terms & Signature */}
                            <div className="flex justify-between items-end mt-12 print:mt-16">
                                <div className="w-1/2 text-[#6b7280] text-sm">
                                    <h4 className="font-medium text-[#374151] mb-1">Terms & Conditions:</h4>
                                    <ul className="list-disc list-inside space-y-1 text-xs">
                                        <li>Goods once sold cannot be Returned or Exchanged.</li>
                                        <li>Subject to Chh. Sambhaji Nagar Jurisdiction</li>
                                        <li>E&OE</li>
                                    </ul>
                                </div>

                                <div className="text-right">
                                    <div className="text-[#1f2937] font-bold text-sm mb-16">{currentStore.name}</div>
                                    <div className="border-t border-gray-400 pt-2 text-[#4b5563] text-sm font-medium inline-block min-w-[200px]">
                                        Authorised Signature
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DESIGN 2: STORE 2 (चैतन्य साहित्य भांडार - Crimson Classic Design, NO Bank Details) */}
                    {activeTab === 'store2' && (
                        <div className="p-8 print:p-0 bg-white">
                            {/* Header: Centered Classic Header with Maroon Accent */}
                            <div className="text-center border-b-2 border-double border-[#991b1b] pb-6 mb-6">
                                <div className="inline-block bg-[#991b1b] text-white text-xs uppercase font-bold tracking-widest px-3 py-0.5 mb-2 rounded-full">
                                    QUOTATION
                                </div>
                                <h1 className="text-3xl font-bold text-[#991b1b] mb-2 tracking-wide font-serif">
                                    {currentStore.name}
                                </h1>
                                <p className="text-gray-700 text-sm max-w-xl mx-auto font-medium">
                                    {currentStore.address}
                                </p>
                                <p className="text-[#991b1b] text-sm font-bold mt-1">
                                    मोबा.: {currentStore.phone}
                                </p>
                            </div>

                            {/* Meta & Customer Block */}
                            <div className="grid grid-cols-2 gap-4 mb-6 bg-red-50/40 p-4 rounded-lg border border-red-100">
                                <div>
                                    <h3 className="text-[#991b1b] text-xs font-bold uppercase tracking-wider mb-1">Quotation For:</h3>
                                    <div className="text-gray-900 font-bold text-base">{customer?.name || quotation.customerName || 'Valued Customer'}</div>
                                    <div className="text-gray-700 text-xs mt-1 whitespace-pre-line">{customer?.address || "No address provided"}</div>
                                    {customer?.phone && <div className="text-gray-700 text-xs mt-0.5">मोबा.: {customer.phone}</div>}
                                </div>
                                <div className="text-right flex flex-col justify-between">
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase font-bold">Serial number:</span>
                                        <div className="text-[#991b1b] font-bold text-base"># {formattedQuoteNo}</div>
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                        <div><span className="font-semibold text-gray-800">दिनांक / Date:</span> {quotation.date ? format(new Date(quotation.date), 'dd-MM-yyyy') : '-'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <table className="w-full text-left text-sm mb-6 border border-red-200">
                                <thead className="bg-[#991b1b] text-white font-medium">
                                    <tr>
                                        <th className="px-4 py-2.5">अ.क्र.</th>
                                        <th className="px-4 py-2.5">तपशील / Description</th>
                                        <th className="px-4 py-2.5 text-center">नग / Qty</th>
                                        <th className="px-4 py-2.5 text-right">दर / Rate (₹)</th>
                                        <th className="px-4 py-2.5 text-right">एकूण / Amount (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-100">
                                    {activeItems.map((item, index) => (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-red-50/20'}>
                                            <td className="px-4 py-2 text-center text-gray-500 font-mono">{index + 1}</td>
                                            <td className="px-4 py-2 font-medium text-gray-900">{item.name || 'Item'}</td>
                                            <td className="px-4 py-2 text-center">{item.quantity}</td>
                                            <td className="px-4 py-2 text-right">₹{item.adjustedPrice.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right font-semibold text-gray-900">₹{item.lineTotal.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Totals Block (NO Bank Details) */}
                            <div className="flex justify-between items-start pt-4 border-t-2 border-[#991b1b]">
                                <div className="w-1/2 text-xs text-gray-700 font-medium pr-4">
                                    <strong>विशेष टीप:</strong> हे अधिकृत दरपत्रक सरकारी / खासगी टेंडरसाठी ग्राह्य आहे.
                                </div>

                                <div className="w-72 space-y-2 bg-red-50/50 p-4 rounded-md border border-red-100">
                                    {activeDiscount > 0 && (
                                        <div className="flex justify-between text-sm text-gray-700">
                                            <span>सवलत / Discount:</span>
                                            <span>-₹{activeDiscount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold text-[#991b1b] border-t border-red-200 pt-2 mt-1">
                                        <span>एकूण रक्कम / Total:</span>
                                        <span>₹{activeTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="text-xs text-[#991b1b] font-semibold text-right mt-1 italic">
                                        अक्षरी रुपये: {numberToWords(activeTotal)}
                                    </div>
                                </div>
                            </div>

                            {/* Terms & Signature */}
                            <div className="flex justify-between items-end mt-12 pt-6 border-t border-gray-200">
                                <div className="w-1/2 text-gray-600 text-xs">
                                    <h4 className="font-bold text-[#991b1b] mb-1">अटी व शर्ती / Terms:</h4>
                                    <ul className="list-disc list-inside space-y-0.5">
                                        <li>एकदा विक्री केलेला माल परत घेतला जाणार नाही.</li>
                                        <li>सर्व वाद छत्रपती संभाजीनगर न्यायालयाच्या अंतर्गत राहतील.</li>
                                        <li>E&OE</li>
                                    </ul>
                                </div>

                                <div className="text-right">
                                    <div className="text-[#991b1b] font-bold text-sm mb-14">करिता, {currentStore.name}</div>
                                    <div className="border-t border-[#991b1b] pt-1.5 text-gray-700 text-xs font-bold inline-block min-w-[180px]">
                                        Signature
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DESIGN 3: STORE 3 (गुरुकृपा एंटरप्राइजेस - Emerald Modern Design, NO Bank Details) */}
                    {activeTab === 'store3' && (
                        <div className="p-8 print:p-0 bg-white">
                            {/* Header: Modern Boxed Card with Emerald Green */}
                            <div className="bg-emerald-50/70 border-2 border-[#047857] rounded-xl p-6 mb-6 flex justify-between items-center">
                                <div>
                                    <div className="inline-block bg-[#047857] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-md mb-2">
                                        QUOTATION
                                    </div>
                                    <h1 className="text-2xl font-black text-[#065f46] mb-1">
                                        {currentStore.name}
                                    </h1>
                                    <p className="text-emerald-900 text-xs font-medium max-w-md leading-relaxed">
                                        {currentStore.address}
                                    </p>
                                    <p className="text-[#047857] text-xs font-bold mt-1">
                                        संपर्क: {currentStore.phone}
                                    </p>
                                </div>
                                <div className="text-right bg-white p-4 rounded-lg border border-emerald-200 shadow-sm min-w-[180px]">
                                    <div className="text-xs text-emerald-800 font-bold uppercase">Serial number</div>
                                    <div className="text-lg font-extrabold text-[#047857]"># {formattedQuoteNo}</div>
                                    <div className="mt-2 text-xs text-gray-600">
                                        <div><strong>दिनांक:</strong> {quotation.date ? format(new Date(quotation.date), 'dd-MM-yyyy') : '-'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Block */}
                            <div className="border-l-4 border-[#047857] bg-gray-50 p-4 mb-6 rounded-r-lg">
                                <h3 className="text-[#047857] text-xs font-bold uppercase tracking-wider mb-1">Quotation For / प्रति:</h3>
                                <div className="text-gray-900 font-extrabold text-base">{customer?.name || quotation.customerName || 'Valued Customer'}</div>
                                <div className="text-gray-700 text-xs mt-1 whitespace-pre-line">{customer?.address || "No address provided"}</div>
                                {customer?.phone && <div className="text-gray-700 text-xs mt-1">फोन: {customer.phone}</div>}
                            </div>

                            {/* Table */}
                            <table className="w-full text-left text-sm mb-6 rounded-lg overflow-hidden border border-emerald-200">
                                <thead className="bg-[#047857] text-white font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">अ.क्र.</th>
                                        <th className="px-4 py-3">साहित्य / Item Description</th>
                                        <th className="px-4 py-3 text-center">संख्या / Qty</th>
                                        <th className="px-4 py-3 text-right">दर / Rate (₹)</th>
                                        <th className="px-4 py-3 text-right">एकूण / Amount (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-100">
                                    {activeItems.map((item, index) => (
                                        <tr key={index} className="hover:bg-emerald-50/30">
                                            <td className="px-4 py-2.5 text-center text-gray-500 font-mono text-xs">{index + 1}</td>
                                            <td className="px-4 py-2.5 font-bold text-gray-800">{item.name || 'Item'}</td>
                                            <td className="px-4 py-2.5 text-center font-semibold">{item.quantity}</td>
                                            <td className="px-4 py-2.5 text-right">₹{item.adjustedPrice.toFixed(2)}</td>
                                            <td className="px-4 py-2.5 text-right font-extrabold text-[#065f46]">₹{item.lineTotal.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Totals (NO Bank Details) */}
                            <div className="flex justify-between items-start pt-4 border-t-2 border-[#047857]">
                                <div className="w-1/2 text-xs text-gray-500">
                                    <div className="bg-emerald-50/50 p-3 rounded-md border border-emerald-100 text-emerald-900">
                                        <strong>विशेष टीप:</strong> हे अधिकृत दरपत्रक सरकारी / खासगी टेंडरसाठी ग्राह्य आहे.
                                    </div>
                                </div>

                                <div className="w-72 bg-emerald-900 text-white p-4 rounded-xl shadow-sm">
                                    {activeDiscount > 0 && (
                                        <div className="flex justify-between text-xs text-emerald-200 mb-1">
                                            <span>सवलत / Discount:</span>
                                            <span>-₹{activeDiscount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-black border-t border-emerald-700 pt-2 mt-1">
                                        <span>एकूण / Total:</span>
                                        <span className="text-emerald-300">₹{activeTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="text-[11px] text-emerald-200 font-medium text-right mt-2 italic">
                                        Rupees {numberToWords(activeTotal)}
                                    </div>
                                </div>
                            </div>

                            {/* Terms & Signature */}
                            <div className="flex justify-between items-end mt-12 pt-6 border-t border-gray-200">
                                <div className="w-1/2 text-gray-600 text-xs">
                                    <h4 className="font-bold text-[#047857] mb-1">नियम व अटी:</h4>
                                    <ol className="list-decimal list-inside space-y-0.5">
                                        <li>माल बुकिंगनंतर डिलिव्हरी दिली जाईल.</li>
                                        <li>सर्व वाद छत्रपती संभाजीनगर न्यायालयाच्या अंतर्गत राहतील.</li>
                                    </ol>
                                </div>

                                <div className="text-right">
                                    <div className="text-[#065f46] font-extrabold text-sm mb-14">करिता, {currentStore.name}</div>
                                    <div className="border-t-2 border-[#047857] pt-1 text-[#047857] text-xs font-extrabold inline-block min-w-[180px]">
                                        स्वाक्षरी / Authorized Signatory
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Vendor Companies Settings Drawer / Modal */}
            {isVendorModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Settings className="h-5 w-5 text-purple-600" />
                                Customize Vendor Stores (+5% / +10%)
                            </h3>
                            <button onClick={() => setIsVendorModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                            <p className="text-xs text-gray-500">
                                Customize vendor names, addresses, phones, and markup percentages here.
                            </p>

                            {/* Store 2 Settings */}
                            <div className="bg-red-50 border border-red-100 p-4 rounded-lg space-y-3">
                                <h4 className="font-bold text-red-700">Store 2 (+5% Price Hike)</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700">Company Name</label>
                                        <input
                                            type="text"
                                            value={stores.store2.name}
                                            onChange={(e) => setStores(prev => ({ ...prev, store2: { ...prev.store2, name: e.target.value } }))}
                                            className="w-full px-3 py-1.5 border rounded-md text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700">Markup % (+5%)</label>
                                        <input
                                            type="number"
                                            value={stores.store2.markup}
                                            onChange={(e) => setStores(prev => ({ ...prev, store2: { ...prev.store2, markup: parseFloat(e.target.value) || 0 } }))}
                                            className="w-full px-3 py-1.5 border rounded-md text-xs"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-semibold text-gray-700">Address</label>
                                        <input
                                            type="text"
                                            value={stores.store2.address}
                                            onChange={(e) => setStores(prev => ({ ...prev, store2: { ...prev.store2, address: e.target.value } }))}
                                            className="w-full px-3 py-1.5 border rounded-md text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Store 3 Settings */}
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg space-y-3">
                                <h4 className="font-bold text-emerald-700">Store 3 (+10% Price Hike)</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700">Company Name</label>
                                        <input
                                            type="text"
                                            value={stores.store3.name}
                                            onChange={(e) => setStores(prev => ({ ...prev, store3: { ...prev.store3, name: e.target.value } }))}
                                            className="w-full px-3 py-1.5 border rounded-md text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700">Markup % (+10%)</label>
                                        <input
                                            type="number"
                                            value={stores.store3.markup}
                                            onChange={(e) => setStores(prev => ({ ...prev, store3: { ...prev.store3, markup: parseFloat(e.target.value) || 0 } }))}
                                            className="w-full px-3 py-1.5 border rounded-md text-xs"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-semibold text-gray-700">Address</label>
                                        <input
                                            type="text"
                                            value={stores.store3.address}
                                            onChange={(e) => setStores(prev => ({ ...prev, store3: { ...prev.store3, address: e.target.value } }))}
                                            className="w-full px-3 py-1.5 border rounded-md text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => {
                                    setIsVendorModalOpen(false);
                                    addToast('Vendor settings updated!', 'success');
                                }}
                                className="bg-purple-600 text-white px-5 py-2 rounded-md hover:bg-purple-700 font-medium text-xs shadow-sm"
                            >
                                Save Vendor Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuotationView;
