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

const QuotationView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { quotations, customers } = useData();
    const { addToast } = useToast();

    const [quotation, setQuotation] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [activeTab, setActiveTab] = useState('store1'); // 'store1', 'store2', 'store3', 'compare'
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

    // Default 3 Stores Setup
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
            badge: 'Base Price (Cheapest / Winner Bid)'
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

    const quoteRef = useRef();

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

    const generateSinglePDF = async (storeKey) => {
        const store = stores[storeKey];
        const markupFactor = 1 + (store.markup / 100);

        // Build temporary container for clean rendering
        const printContainer = document.createElement('div');
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        printContainer.style.top = '-9999px';
        printContainer.style.width = '800px';
        printContainer.style.backgroundColor = '#ffffff';
        printContainer.style.padding = '30px';
        printContainer.style.fontFamily = 'sans-serif';

        let subtotal = 0;
        const itemRowsHTML = (quotation.items || []).map(item => {
            const basePrice = parseFloat(item.price) || 0;
            const price = Math.round(basePrice * markupFactor);
            const qty = parseFloat(item.quantity) || 0;
            const lineTotal = price * qty;
            subtotal += lineTotal;
            return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px; font-weight: 500;">${item.name || 'Item'}</td>
                    <td style="padding: 8px; text-align: center;">${qty}</td>
                    <td style="padding: 8px; text-align: right;">₹${price.toFixed(2)}</td>
                    <td style="padding: 8px; text-align: right; font-weight: 600;">₹${lineTotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        const discount = parseFloat(quotation.discount) || 0;
        const total = Math.max(0, subtotal - discount);

        printContainer.innerHTML = `
            <div style="border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between;">
                <div>
                    <h2 style="font-size: 22px; font-weight: bold; color: #1d4ed8; margin: 0 0 5px 0;">${store.name}</h2>
                    <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.4;">
                        ${store.address}<br/>
                        ${store.gstin ? `GSTIN: ${store.gstin}<br/>` : ''}
                        Phone: ${store.phone}
                    </p>
                </div>
                <div style="text-align: right;">
                    <h1 style="font-size: 26px; font-weight: 300; color: #0f172a; margin: 0 0 5px 0;">QUOTATION</h1>
                    <p style="font-size: 12px; font-weight: bold; color: #2563eb; margin: 0;"># ${quotation.quotationNumber || quotation.id}</p>
                    <p style="font-size: 11px; color: #64748b; margin: 5px 0 0 0;">
                        Date: ${quotation.date ? format(new Date(quotation.date), 'dd-MM-yyyy') : '-'}<br/>
                        ${quotation.validUntil ? `Valid Until: ${format(new Date(quotation.validUntil), 'dd-MM-yyyy')}` : ''}
                    </p>
                </div>
            </div>

            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
                <h4 style="font-size: 11px; font-weight: bold; color: #1d4ed8; text-transform: uppercase; margin: 0 0 4px 0;">Quotation For:</h4>
                <div style="font-size: 14px; font-weight: bold; color: #0f172a;">${customer?.name || quotation.customerName || 'Valued Customer'}</div>
                ${customer?.address ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">${customer.address}</div>` : ''}
                ${customer?.phone ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">Phone: ${customer.phone}</div>` : ''}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
                <thead>
                    <tr style="background: #1d4ed8; color: #ffffff;">
                        <th style="padding: 8px; text-align: left;">Item Description</th>
                        <th style="padding: 8px; text-align: center; width: 60px;">Qty</th>
                        <th style="padding: 8px; text-align: right; width: 100px;">Rate (₹)</th>
                        <th style="padding: 8px; text-align: right; width: 110px;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRowsHTML}
                </tbody>
            </table>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                <div style="width: 50%; font-size: 11px; color: #475569;">
                    ${store.bankName ? `
                        <h4 style="font-size: 11px; font-weight: bold; color: #1d4ed8; margin: 0 0 4px 0;">Bank Details:</h4>
                        <p style="margin: 0; line-height: 1.4;">
                            Bank: ${store.bankName}<br/>
                            A/C No: ${store.accountNo}<br/>
                            Branch: ${store.branch}<br/>
                            IFSC: ${store.ifsc}
                        </p>
                    ` : ''}
                </div>
                <div style="width: 45%; background: #f8fafc; padding: 12px; border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569; margin-bottom: 4px;">
                        <span>Subtotal:</span>
                        <span>₹${subtotal.toFixed(2)}</span>
                    </div>
                    ${discount > 0 ? `
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569; margin-bottom: 4px;">
                            <span>Discount:</span>
                            <span>-₹${discount.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #0f172a; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 6px;">
                        <span>Total Quote:</span>
                        <span>₹${total.toFixed(2)}</span>
                    </div>
                    <div style="font-size: 10px; font-weight: bold; color: #1d4ed8; text-align: right; margin-top: 6px; font-style: italic;">
                        Rupees ${numberToWords(total)}
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px;">
                <div style="font-size: 10px; color: #64748b;">
                    <strong>Terms & Conditions:</strong><br/>
                    1. Quotation valid for 30 days from date of issue.<br/>
                    2. Subject to local jurisdiction.<br/>
                    3. E&OE
                </div>
                <div style="text-align: right; font-size: 11px;">
                    <div style="font-weight: bold; margin-bottom: 35px;">For ${store.name}</div>
                    <div style="border-top: 1px solid #475569; padding-top: 3px; font-weight: bold;">Authorised Signature</div>
                </div>
            </div>
        `;

        document.body.appendChild(printContainer);

        try {
            const canvas = await html2canvas(printContainer, { scale: 2, backgroundColor: '#ffffff' });
            document.body.removeChild(printContainer);

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

            const filename = `Quotation_${store.name.replace(/\s+/g, '_')}_${quotation.quotationNumber}.pdf`;
            pdf.save(filename);
            return true;
        } catch (err) {
            if (document.body.contains(printContainer)) document.body.removeChild(printContainer);
            throw err;
        }
    };

    const handleDownloadCurrentPDF = async () => {
        if (activeTab === 'compare') {
            addToast('Please select a specific store tab to download its PDF', 'info');
            return;
        }
        try {
            await generateSinglePDF(activeTab);
            addToast('PDF downloaded successfully', 'success');
        } catch (err) {
            console.error(err);
            addToast('Failed to generate PDF', 'error');
        }
    };

    const handleDownloadAllThreePDFs = async () => {
        try {
            addToast('Generating all 3 store quotation PDFs...', 'info');
            await generateSinglePDF('store1');
            await new Promise(res => setTimeout(res, 600));
            await generateSinglePDF('store2');
            await new Promise(res => setTimeout(res, 600));
            await generateSinglePDF('store3');
            addToast('All 3 quotation PDFs generated and downloaded!', 'success');
        } catch (err) {
            console.error(err);
            addToast('Failed to generate 3 quotation PDFs', 'error');
        }
    };

    if (!quotation) {
        return <div className="p-8">Loading quotation...</div>;
    }

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
        <div className="max-w-5xl mx-auto mb-10 print:mb-0">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link to="/quotations" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            Quotation {quotation.quotationNumber || quotation.id}
                        </h1>
                        <p className="text-xs text-gray-500">3-Store Bidding Engine for Procurement</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsVendorModalOpen(true)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 text-xs font-medium"
                        title="Edit ABC & XYZ Enterprises Company Details"
                    >
                        <Settings className="h-4 w-4 text-purple-600" />
                        Edit Vendors (+5% / +10%)
                    </button>

                    <button
                        onClick={handlePrint}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 text-xs font-medium"
                    >
                        <Printer className="h-4 w-4" />
                        Print Active Quote
                    </button>

                    <button
                        onClick={handleDownloadCurrentPDF}
                        disabled={activeTab === 'compare'}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
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
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2 print:hidden">
                <button
                    onClick={() => setActiveTab('store1')}
                    className={`px-4 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'store1'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
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
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                >
                    <Building2 className="h-4 w-4" />
                    <span>{stores.store2.name}</span>
                    <span className="bg-purple-800/40 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        +{stores.store2.markup}%
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('store3')}
                    className={`px-4 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'store3'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                >
                    <Building2 className="h-4 w-4" />
                    <span>{stores.store3.name}</span>
                    <span className="bg-indigo-800/40 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        +{stores.store3.markup}%
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('compare')}
                    className={`px-4 py-2.5 rounded-t-lg font-medium text-sm flex items-center gap-2 transition-colors ml-auto ${activeTab === 'compare'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50'
                        }`}
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    Side-by-Side 3-Store Comparison Matrix
                </button>
            </div>

            {/* TAB CONTENT: Comparative Matrix View */}
            {activeTab === 'compare' ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                                3-Vendor Comparative Bid Analysis
                            </h2>
                            <p className="text-sm text-gray-500">Side-by-side price markup comparison for client tender submission</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Cheapest Bid Winner: {stores.store1.name}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold border-y border-gray-200 dark:border-gray-600">
                                <tr>
                                    <th className="px-4 py-3">Item Description</th>
                                    <th className="px-4 py-3 text-center">Qty</th>
                                    <th className="px-4 py-3 text-right bg-blue-50/50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200">
                                        {stores.store1.name} (Base)
                                    </th>
                                    <th className="px-4 py-3 text-right bg-purple-50/50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-200">
                                        {stores.store2.name} (+{stores.store2.markup}%)
                                    </th>
                                    <th className="px-4 py-3 text-right bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-200">
                                        {stores.store3.name} (+{stores.store3.markup}%)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
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
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.name || 'Item'}</td>
                                            <td className="px-4 py-3 text-center font-semibold">{qty}</td>
                                            <td className="px-4 py-3 text-right bg-blue-50/20 dark:bg-blue-900/10 font-medium">
                                                ₹{price1.toFixed(2)} <span className="text-gray-400 text-xs">(₹{total1.toFixed(2)})</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-purple-50/20 dark:bg-purple-900/10 font-medium">
                                                ₹{price2.toFixed(2)} <span className="text-gray-400 text-xs">(₹{total2.toFixed(2)})</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-indigo-50/20 dark:bg-indigo-900/10 font-medium">
                                                ₹{price3.toFixed(2)} <span className="text-gray-400 text-xs">(₹{total3.toFixed(2)})</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-100 dark:bg-gray-700 font-bold border-t-2 border-gray-300 dark:border-gray-500">
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
                                            <td className="px-4 py-4 text-right text-base text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/30">
                                                ₹{grand1.toFixed(2)}
                                                <div className="text-[10px] text-emerald-600 font-semibold uppercase">✓ Lowest (Order Winner)</div>
                                            </td>
                                            <td className="px-4 py-4 text-right text-base text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-900/30">
                                                ₹{grand2.toFixed(2)}
                                                <div className="text-[10px] text-purple-600 font-semibold uppercase">+{stores.store2.markup}% Bid</div>
                                            </td>
                                            <td className="px-4 py-4 text-right text-base text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-900/30">
                                                ₹{grand3.toFixed(2)}
                                                <div className="text-[10px] text-indigo-600 font-semibold uppercase">+{stores.store3.markup}% Bid</div>
                                            </td>
                                        </tr>
                                    );
                                })()}
                            </tfoot>
                        </table>
                    </div>
                </div>
            ) : (
                /* TAB CONTENT: Single Quotation Document View */
                <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-md p-8 print:p-0 print:border-none print:shadow-none" ref={quoteRef}>
                    <div className="flex justify-between items-start mb-8 border-b border-gray-200 pb-6">
                        <div>
                            <div className="text-2xl font-bold text-blue-700 mb-1">{currentStore.name}</div>
                            <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed">
                                {currentStore.address}<br />
                                {currentStore.gstin && <span>GSTIN: {currentStore.gstin}<br /></span>}
                                Phone: {currentStore.phone}
                            </p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-light text-gray-800 mb-1">QUOTATION</h2>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                {currentStore.badge}
                            </span>
                            <p className="text-gray-700 font-medium text-sm mt-3"># {quotation.quotationNumber || quotation.id}</p>
                            <div className="mt-2 text-xs text-gray-500 space-y-1">
                                <div><span className="font-semibold text-gray-700">Date:</span> {quotation.date ? format(new Date(quotation.date), 'dd-MM-yyyy') : '-'}</div>
                                {quotation.validUntil && <div><span className="font-semibold text-gray-700">Valid Until:</span> {format(new Date(quotation.validUntil), 'dd-MM-yyyy')}</div>}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-100">
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Quotation For:</h3>
                        <div className="text-gray-900 font-bold text-base">{customer?.name || quotation.customerName || 'Valued Customer'}</div>
                        {customer?.address && <div className="text-gray-600 text-xs mt-1 whitespace-pre-line">{customer.address}</div>}
                        {customer?.phone && <div className="text-gray-600 text-xs mt-1">Phone: {customer.phone}</div>}
                    </div>

                    <table className="w-full text-left text-sm mb-6 border-collapse">
                        <thead className="bg-blue-700 text-white font-medium">
                            <tr>
                                <th className="px-4 py-3">Item Description</th>
                                <th className="px-4 py-3 text-center">Qty</th>
                                <th className="px-4 py-3 text-right">Rate (₹)</th>
                                <th className="px-4 py-3 text-right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 border-b border-gray-200">
                            {activeItems.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-4 py-2.5 font-medium text-gray-800">{item.name}</td>
                                    <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                                    <td className="px-4 py-2.5 text-right">₹{item.adjustedPrice.toFixed(2)}</td>
                                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">₹{item.lineTotal.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-between items-start border-t border-gray-200 pt-6 mt-6">
                        <div className="w-1/2 text-xs text-gray-600">
                            {currentStore.bankName && (
                                <div className="bg-gray-50 p-3 rounded-md">
                                    <h4 className="font-bold text-blue-700 text-xs mb-1">Bank Details:</h4>
                                    <div>Bank: {currentStore.bankName}</div>
                                    <div>A/C No: {currentStore.accountNo}</div>
                                    <div>Branch: {currentStore.branch}</div>
                                    <div>IFSC: {currentStore.ifsc}</div>
                                </div>
                            )}
                        </div>

                        <div className="w-72 space-y-2 bg-gray-50 p-4 rounded-md">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal:</span>
                                <span>₹{activeSubtotal.toFixed(2)}</span>
                            </div>
                            {activeDiscount > 0 && (
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Discount:</span>
                                    <span>-₹{activeDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-300 pt-2 mt-2">
                                <span>Total Quote:</span>
                                <span className="text-blue-700">₹{activeTotal.toFixed(2)}</span>
                            </div>
                            <div className="text-xs text-blue-700 font-semibold text-right mt-1 italic">
                                Rupees {numberToWords(activeTotal)}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-end mt-12 pt-6 border-t border-gray-100">
                        <div className="w-1/2 text-gray-500 text-xs">
                            <h4 className="font-semibold text-gray-700 mb-1">Terms & Conditions:</h4>
                            <ol className="list-decimal list-inside space-y-0.5">
                                <li>Quotation valid for 30 days from date of issue.</li>
                                <li>Subject to local jurisdiction.</li>
                                <li>E&OE</li>
                            </ol>
                        </div>
                        <div className="text-right">
                            <div className="text-gray-800 font-bold text-xs mb-12">For {currentStore.name}</div>
                            <div className="border-t border-gray-400 pt-1 text-gray-600 text-xs font-semibold inline-block min-w-[180px]">
                                Authorised Signature
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vendor Companies Settings Drawer / Modal */}
            {isVendorModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Settings className="h-5 w-5 text-purple-600" />
                                Customize Vendor Stores (+5% / +10%)
                            </h3>
                            <button onClick={() => setIsVendorModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                            <p className="text-xs text-gray-500">
                                You can change the dummy vendor names, addresses, phones, and markup percentages here to match your real partner companies.
                            </p>

                            {/* Store 2 Settings */}
                            <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 p-4 rounded-lg space-y-3">
                                <h4 className="font-bold text-purple-700 dark:text-purple-300">Store 2 (Second Vendor - Default +5%)</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Company Name</label>
                                        <input
                                            type="text"
                                            value={stores.store2.name}
                                            onChange={(e) => setStores(prev => ({ ...prev, store2: { ...prev.store2, name: e.target.value } }))}
                                            className="w-full px-3 py-1.5 border rounded-md dark:bg-gray-700 dark:text-white text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Markup % (+5%)</label>
                                        <input
                                            type="number"
                                            value={stores.store2.markup}
                                            onChange={(e) => setStores(prev => ({ ...prev, store2: { ...prev.store2, markup: parseFloat(e.target.value) || 0 } }))}
                                            className="w-full px-3 py-1.5 border rounded-md dark:bg-gray-700 dark:text-white text-xs"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Address</label>
                                        <input
                                            type="text"
                                            value={stores.store2.address}
                                            onChange={(e) => setStores(prev => ({ ...prev, store2: { ...prev.store2, address: e.target.value } }))}
                                            className="w-full px-3 py-1.5 border rounded-md dark:bg-gray-700 dark:text-white text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Store 3 Settings */}
                            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 p-4 rounded-lg space-y-3">
                                <h4 className="font-bold text-indigo-700 dark:text-indigo-300">Store 3 (Third Vendor - Default +10%)</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Company Name</label>
                                        <input
                                            type="text"
                                            value={stores.store3.name}
                                            onChange={(e) => setStores(prev => ({ ...prev, store3: { ...prev.store3, name: e.target.value } }))}
                                            className="w-full px-3 py-1.5 border rounded-md dark:bg-gray-700 dark:text-white text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Markup % (+10%)</label>
                                        <input
                                            type="number"
                                            value={stores.store3.markup}
                                            onChange={(e) => setStores(prev => ({ ...prev, store3: { ...prev.store3, markup: parseFloat(e.target.value) || 0 } }))}
                                            className="w-full px-3 py-1.5 border rounded-md dark:bg-gray-700 dark:text-white text-xs"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Address</label>
                                        <input
                                            type="text"
                                            value={stores.store3.address}
                                            onChange={(e) => setStores(prev => ({ ...prev, store3: { ...prev.store3, address: e.target.value } }))}
                                            className="w-full px-3 py-1.5 border rounded-md dark:bg-gray-700 dark:text-white text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end">
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
