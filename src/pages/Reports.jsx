import { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import {
    Calendar,
    Download,
    Printer,
    FileSpreadsheet,
    Search,
    IndianRupee,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    FileText,
    Users,
    Package,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    Building2,
    Eye
} from 'lucide-react';
import {
    format,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfDay,
    endOfDay
} from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Helper to convert legacy Marathi/Devanagari characters if any
const convertLegacyMarathi = (text) => {
    if (!text || typeof text !== 'string') return text || '';
    return text
        .replace(/\? \* \*M0> 6> 6G&M0> \.\(0/g, 'जि प प्रा शा शेंद्रा कमनगर')
        .replace(/5\?&M\/>0M%@ 9G0@/g, 'विद्यार्थी हजेरी')
        .replace(/5\?&M\/>0M%@/g, 'विद्यार्थी');
};

const Reports = () => {
    const { invoices, customers, items, loading } = useData();
    const { addToast } = useToast();
    const reportRef = useRef();

    // Default to Last 3 Months
    const now = new Date();
    const defaultStart = format(startOfDay(subMonths(now, 3)), 'yyyy-MM-dd');
    const defaultEnd = format(endOfDay(now), 'yyyy-MM-dd');

    const [preset, setPreset] = useState('3months');
    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [statusFilter, setStatusFilter] = useState('All');
    const [customerFilter, setCustomerFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'items' | 'customers'
    const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
    const [copied, setCopied] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Apply quick date presets
    const handlePresetChange = (selectedPreset) => {
        setPreset(selectedPreset);
        const today = new Date();

        switch (selectedPreset) {
            case 'thisMonth': {
                setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
                setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
                break;
            }
            case 'lastMonth': {
                const prevMonth = subMonths(today, 1);
                setStartDate(format(startOfMonth(prevMonth), 'yyyy-MM-dd'));
                setEndDate(format(endOfMonth(prevMonth), 'yyyy-MM-dd'));
                break;
            }
            case '3months': {
                setStartDate(format(startOfDay(subMonths(today, 3)), 'yyyy-MM-dd'));
                setEndDate(format(endOfDay(today), 'yyyy-MM-dd'));
                break;
            }
            case '6months': {
                setStartDate(format(startOfDay(subMonths(today, 6)), 'yyyy-MM-dd'));
                setEndDate(format(endOfDay(today), 'yyyy-MM-dd'));
                break;
            }
            case 'thisFY': {
                // Indian Financial Year: April 1 to March 31
                const currentYear = today.getFullYear();
                const currentMonth = today.getMonth(); // 0-indexed (April is 3)
                const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
                setStartDate(format(new Date(fyStartYear, 3, 1), 'yyyy-MM-dd'));
                setEndDate(format(new Date(fyStartYear + 1, 2, 31), 'yyyy-MM-dd'));
                break;
            }
            case 'allTime': {
                setStartDate('2020-01-01');
                setEndDate(format(endOfDay(today), 'yyyy-MM-dd'));
                break;
            }
            case 'custom':
            default:
                break;
        }
    };

    // Customer lookup map
    const customerMap = useMemo(() => {
        const map = new Map();
        (customers || []).forEach(c => map.set(c.id, c));
        return map;
    }, [customers]);

    // Item lookup map
    const itemMap = useMemo(() => {
        const map = new Map();
        (items || []).forEach(i => map.set(i.id, i));
        return map;
    }, [items]);

    // Filter invoices within selected date range and criteria
    const filteredInvoices = useMemo(() => {
        if (!invoices || invoices.length === 0) return [];

        const start = startDate ? new Date(startDate + 'T00:00:00') : new Date('1970-01-01');
        const end = endDate ? new Date(endDate + 'T23:59:59') : new Date('2099-12-31');

        return invoices.filter(inv => {
            const invDate = inv.date ? new Date(inv.date) : new Date();
            const inRange = invDate >= start && invDate <= end;
            if (!inRange) return false;

            if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
            if (customerFilter !== 'All' && inv.customerId !== customerFilter) return false;

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const cust = customerMap.get(inv.customerId);
                const custName = (cust?.name || inv.customerName || '').toLowerCase();
                const invNum = (inv.invoiceNumber || '').toLowerCase();
                const gstin = (cust?.gstin || inv.customerGstin || '').toLowerCase();
                const itemMatch = (inv.items || []).some(it => {
                    const foundItem = itemMap.get(it.itemId);
                    const name = (foundItem?.name || it.name || '').toLowerCase();
                    return name.includes(term);
                });

                if (!custName.includes(term) && !invNum.includes(term) && !gstin.includes(term) && !itemMatch) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }, [invoices, startDate, endDate, statusFilter, customerFilter, searchTerm, customerMap, itemMap]);

    // Calculate executive financial totals
    const financialSummary = useMemo(() => {
        let totalTurnover = 0;
        let totalDiscount = 0;
        let totalNetBilled = 0;
        let totalPaid = 0;
        let paidCount = 0;
        let partialCount = 0;
        let draftCount = 0;
        let unpaidCount = 0;

        filteredInvoices.forEach(inv => {
            const calculatedSubtotal = (inv.items || []).reduce((sum, it) => sum + ((parseFloat(it.quantity) || 0) * (parseFloat(it.price) || 0)), 0);
            const disc = parseFloat(inv.discount) || 0;
            const net = parseFloat(inv.total) || Math.max(0, calculatedSubtotal - disc);
            const paid = (inv.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) + (inv.status === 'Paid' && (!inv.payments || inv.payments.length === 0) ? net : 0);

            totalTurnover += calculatedSubtotal;
            totalDiscount += disc;
            totalNetBilled += net;
            totalPaid += paid;

            if (inv.status === 'Paid') paidCount++;
            else if (inv.status === 'Partial') partialCount++;
            else if (inv.status === 'Draft') draftCount++;
            else unpaidCount++;
        });

        const totalBalanceDue = Math.max(0, totalNetBilled - totalPaid);

        return {
            totalInvoices: filteredInvoices.length,
            totalTurnover,
            totalDiscount,
            totalNetBilled,
            totalPaid,
            totalBalanceDue,
            paidCount,
            partialCount,
            draftCount,
            unpaidCount
        };
    }, [filteredInvoices]);

    // Item-wise sales aggregation
    const itemSalesSummary = useMemo(() => {
        const itemAgg = new Map();

        filteredInvoices.forEach(inv => {
            (inv.items || []).forEach(it => {
                const id = it.itemId || it.name || 'unknown';
                const originalItem = itemMap.get(it.itemId);
                const name = originalItem?.name || it.name || 'Unknown Item';
                const qty = parseFloat(it.quantity) || 0;
                const price = parseFloat(it.price) || 0;
                const lineTotal = qty * price;

                if (!itemAgg.has(id)) {
                    itemAgg.set(id, {
                        id,
                        name,
                        totalQty: 0,
                        totalRevenue: 0,
                        invoiceOccurrences: 0,
                        prices: []
                    });
                }

                const current = itemAgg.get(id);
                current.totalQty += qty;
                current.totalRevenue += lineTotal;
                current.invoiceOccurrences += 1;
                current.prices.push(price);
            });
        });

        return Array.from(itemAgg.values())
            .map(item => ({
                ...item,
                avgPrice: item.totalQty > 0 ? (item.totalRevenue / item.totalQty) : 0,
                revenueShare: financialSummary.totalTurnover > 0 ? ((item.totalRevenue / financialSummary.totalTurnover) * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.totalRevenue - a.totalRevenue);
    }, [filteredInvoices, itemMap, financialSummary.totalTurnover]);

    // Customer-wise sales & receivables aggregation
    const customerSummary = useMemo(() => {
        const custAgg = new Map();

        filteredInvoices.forEach(inv => {
            const custId = inv.customerId || 'walk-in';
            const custObj = customerMap.get(custId);
            const name = custObj?.name || inv.customerName || 'Walk-in / Unknown Customer';
            const gstin = custObj?.gstin || inv.customerGstin || '-';
            const phone = custObj?.phone || '-';

            const net = parseFloat(inv.total) || 0;
            const paid = (inv.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) + (inv.status === 'Paid' && (!inv.payments || inv.payments.length === 0) ? net : 0);

            if (!custAgg.has(custId)) {
                custAgg.set(custId, {
                    id: custId,
                    name,
                    gstin,
                    phone,
                    invoicesCount: 0,
                    totalBilled: 0,
                    totalPaid: 0,
                    balanceDue: 0
                });
            }

            const current = custAgg.get(custId);
            current.invoicesCount += 1;
            current.totalBilled += net;
            current.totalPaid += paid;
            current.balanceDue += Math.max(0, net - paid);
        });

        return Array.from(custAgg.values()).sort((a, b) => b.totalBilled - a.totalBilled);
    }, [filteredInvoices, customerMap]);

    // Export CSV / Excel for CA
    const handleDownloadCSV = () => {
        try {
            if (filteredInvoices.length === 0) {
                addToast('No invoices found in selected date range to export', 'error');
                return;
            }

            const formatCurrencyCSV = (num) => (parseFloat(num) || 0).toFixed(2);
            const sanitize = (text) => {
                if (!text) return '""';
                const clean = String(text).replace(/"/g, '""');
                return `"${clean}"`;
            };

            const headerLines = [
                `"SALES & TAX REPORT (FOR CHARTERED ACCOUNTANT / AUDIT)"`,
                `"Company Name:","Shri Brahmchaitanya Enterprises"`,
                `"GSTIN:","27AWRPP6364M1ZI"`,
                `"Unique Code:","VAMHAU00097869"`,
                `"Tax Scheme:","Composition Scheme (Dealer not eligible to collect tax on supply)"`,
                `"Report Period:",${sanitize(format(new Date(startDate), 'dd-MMM-yyyy') + ' to ' + format(new Date(endDate), 'dd-MMM-yyyy'))}`,
                `"Generated On:",${sanitize(format(new Date(), 'dd-MMM-yyyy HH:mm'))}`,
                `"Total Invoices:",${financialSummary.totalInvoices}`,
                `"Total Gross Sales (Rs.):",${formatCurrencyCSV(financialSummary.totalTurnover)}`,
                `"Total Discount (Rs.):",${formatCurrencyCSV(financialSummary.totalDiscount)}`,
                `"Total Net Billed Value (Rs.):",${formatCurrencyCSV(financialSummary.totalNetBilled)}`,
                `"Total Amount Collected (Rs.):",${formatCurrencyCSV(financialSummary.totalPaid)}`,
                `"Total Outstanding Balance (Rs.):",${formatCurrencyCSV(financialSummary.totalBalanceDue)}`,
                `""`,
                // Detailed Table Headers
                [
                    `"Sr. No."`,
                    `"Invoice Date"`,
                    `"Invoice Number"`,
                    `"Customer Name"`,
                    `"Customer GSTIN"`,
                    `"Customer Phone"`,
                    `"Items Summary"`,
                    `"Items Count"`,
                    `"Gross Amount (Rs.)"`,
                    `"Discount (Rs.)"`,
                    `"Net Invoice Amount (Rs.)"`,
                    `"Paid Amount (Rs.)"`,
                    `"Balance Due (Rs.)"`,
                    `"Payment Status"`,
                    `"Due Date"`
                ].join(',')
            ];

            const rowLines = filteredInvoices.map((inv, idx) => {
                const cust = customerMap.get(inv.customerId);
                const custName = convertLegacyMarathi(cust?.name || inv.customerName || 'Customer');
                const custGstin = cust?.gstin || inv.customerGstin || '';
                const custPhone = cust?.phone || '';
                
                const itemsList = (inv.items || []).map(it => {
                    const foundItem = itemMap.get(it.itemId);
                    const itName = convertLegacyMarathi(foundItem?.name || it.name || 'Item');
                    return `${itName} (Qty: ${it.quantity} @ Rs.${it.price})`;
                }).join('; ');

                const gross = (inv.items || []).reduce((sum, it) => sum + ((parseFloat(it.quantity) || 0) * (parseFloat(it.price) || 0)), 0);
                const discount = parseFloat(inv.discount) || 0;
                const net = parseFloat(inv.total) || Math.max(0, gross - discount);
                const paid = (inv.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) + (inv.status === 'Paid' && (!inv.payments || inv.payments.length === 0) ? net : 0);
                const bal = Math.max(0, net - paid);

                return [
                    idx + 1,
                    sanitize(inv.date ? format(new Date(inv.date), 'dd-MM-yyyy') : ''),
                    sanitize(inv.invoiceNumber || ''),
                    sanitize(custName),
                    sanitize(custGstin),
                    sanitize(custPhone),
                    sanitize(itemsList),
                    inv.items?.length || 0,
                    formatCurrencyCSV(gross),
                    formatCurrencyCSV(discount),
                    formatCurrencyCSV(net),
                    formatCurrencyCSV(paid),
                    formatCurrencyCSV(bal),
                    sanitize(inv.status || 'Draft'),
                    sanitize(inv.dueDate ? format(new Date(inv.dueDate), 'dd-MM-yyyy') : '')
                ].join(',');
            });

            // Summary row at the bottom
            const summaryRow = [
                `"TOTALS"`,
                `""`,
                `""`,
                `""`,
                `""`,
                `""`,
                `""`,
                `""`,
                formatCurrencyCSV(financialSummary.totalTurnover),
                formatCurrencyCSV(financialSummary.totalDiscount),
                formatCurrencyCSV(financialSummary.totalNetBilled),
                formatCurrencyCSV(financialSummary.totalPaid),
                formatCurrencyCSV(financialSummary.totalBalanceDue),
                `""`,
                `""`
            ].join(',');

            const csvContent = '\uFEFF' + [...headerLines, ...rowLines, summaryRow].join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `CA_Sales_Report_${startDate}_to_${endDate}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            addToast('CA Excel/CSV Report downloaded successfully!', 'success');
        } catch (error) {
            console.error('Error exporting CSV:', error);
            addToast('Failed to export CSV report', 'error');
        }
    };

    // Download PDF Report for CA
    const handleDownloadPDF = async () => {
        const element = reportRef.current;
        if (!element) return;

        try {
            setIsGeneratingPdf(true);
            addToast('Generating CA PDF Statement...', 'info');

            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('ca-report-sheet');
                    if (el) {
                        el.style.boxShadow = 'none';
                        el.style.padding = '20px';
                        el.style.backgroundColor = '#ffffff';

                        // Override dark styles and colors for crisp PDF
                        const style = clonedDoc.createElement('style');
                        style.innerHTML = `
                            :root, * {
                                color: #111827 !important;
                                background-color: transparent !important;
                                border-color: #e5e7eb !important;
                            }
                            .pdf-bg-white { background-color: #ffffff !important; }
                            .pdf-bg-gray { background-color: #f9fafb !important; }
                            .pdf-bg-blue { background-color: #eff6ff !important; }
                            .pdf-text-blue { color: #1d4ed8 !important; }
                            .pdf-text-green { color: #15803d !important; }
                            .pdf-text-amber { color: #b45309 !important; }
                            .pdf-border { border: 1px solid #e5e7eb !important; }
                        `;
                        clonedDoc.head.appendChild(style);
                    }
                }
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // Handle multi-page if height exceeds page
            const pageHeight = pdf.internal.pageSize.getHeight();
            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`CA_Tax_Report_${startDate}_to_${endDate}.pdf`);
            addToast('CA PDF Statement downloaded successfully!', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            addToast(`Failed to generate PDF: ${error.message || String(error)}`, 'error');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Copy WhatsApp / Text Summary for CA
    const handleCopySummary = () => {
        const text = `📊 *Sales & Tax Report for CA (Shri Brahmchaitanya Enterprises)*
📅 *Period:* ${format(new Date(startDate), 'dd-MMM-yyyy')} to ${format(new Date(endDate), 'dd-MMM-yyyy')}
🏢 *GSTIN:* 27AWRPP6364M1ZI (Composition Scheme)

🧾 *Total Invoices:* ${financialSummary.totalInvoices}
💰 *Gross Turnover:* ₹${financialSummary.totalTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
🎁 *Total Discounts:* ₹${financialSummary.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
💵 *Net Billed Value:* ₹${financialSummary.totalNetBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
✅ *Total Collections:* ₹${financialSummary.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
⏳ *Balance Outstanding:* ₹${financialSummary.totalBalanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

_Generated from Brahmchaitanya Billing System_`;

        navigator.clipboard.writeText(text);
        setCopied(true);
        addToast('CA Summary copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 3000);
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Top Bar Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div>
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Reports & CA Tax Statements
                        </h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Detailed invoice schedules, turnover analysis, and instant exports for Chartered Accountant (CA) filing.
                    </p>
                </div>

                {/* Export Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={handleCopySummary}
                        className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                        title="Copy text summary for WhatsApp / Email"
                    >
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
                        <span>{copied ? 'Copied' : 'Copy CA Summary'}</span>
                    </button>

                    <button
                        onClick={handlePrint}
                        className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                        <Printer className="h-4 w-4 text-gray-500" />
                        <span>Print</span>
                    </button>

                    <button
                        onClick={handleDownloadCSV}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
                        title="Download CSV for Microsoft Excel / Tally"
                    >
                        <Download className="h-4 w-4" />
                        <span>Download CA Excel / CSV</span>
                    </button>

                    <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPdf}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02] disabled:opacity-50"
                    >
                        <FileText className="h-4 w-4" />
                        <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download CA PDF Statement'}</span>
                    </button>
                </div>
            </div>

            {/* Date Range & Filter Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-200">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span>Date Range Presets:</span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                        {[
                            { key: '3months', label: 'Last 3 Months (Quarter)' },
                            { key: 'thisMonth', label: 'This Month' },
                            { key: 'lastMonth', label: 'Last Month' },
                            { key: '6months', label: 'Last 6 Months' },
                            { key: 'thisFY', label: 'Financial Year (FY)' },
                            { key: 'allTime', label: 'All Time' },
                            { key: 'custom', label: 'Custom' }
                        ].map(p => (
                            <button
                                key={p.key}
                                onClick={() => handlePresetChange(p.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    preset === p.key
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                            From Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setPreset('custom');
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                            To Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setPreset('custom');
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                            Customer Filter
                        </label>
                        <select
                            value={customerFilter}
                            onChange={(e) => setCustomerFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="All">All Customers ({customers?.length || 0})</option>
                            {(customers || []).map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {c.gstin ? `(${c.gstin})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                            Payment Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Paid">Paid Only</option>
                            <option value="Partial">Partial / Pending</option>
                            <option value="Sent">Sent / Unpaid</option>
                            <option value="Draft">Draft</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* CA Printable Sheet Container (Captured for PDF and displayed on screen) */}
            <div
                ref={reportRef}
                id="ca-report-sheet"
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6"
            >
                {/* Official Letterhead Header for CA */}
                <div className="border-b-2 border-blue-600 pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <div className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1">
                            Official CA Tax & Audit Statement
                        </div>
                        <h2 className="text-2xl font-black text-blue-700 dark:text-blue-400 tracking-tight">
                            Shri Brahmchaitanya Enterprises
                        </h2>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                            N-11, B 19/4, Subhashchandra Bose Nagar, Hudco, Chh. Sambhaji Nagar - 431003<br />
                            <strong>GSTIN:</strong> 27AWRPP6364M1ZI | <strong>Unique Code:</strong> VAMHAU00097869 | <strong>Phone:</strong> +91 81809 19544
                        </p>
                    </div>

                    <div className="text-left md:text-right bg-blue-50/70 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50 min-w-[240px]">
                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            STATEMENT PERIOD:
                        </div>
                        <div className="text-sm font-black text-blue-700 dark:text-blue-400">
                            {format(new Date(startDate), 'dd MMM yyyy')} — {format(new Date(endDate), 'dd MMM yyyy')}
                        </div>
                        <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
                            Composition Scheme (GST Composition Dealer)
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            Generated: {format(new Date(), 'dd-MMM-yyyy, hh:mm a')}
                        </div>
                    </div>
                </div>

                {/* Executive Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold">
                            <span>Invoices</span>
                            <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
                            {financialSummary.totalInvoices}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {financialSummary.paidCount} Paid • {financialSummary.unpaidCount + financialSummary.partialCount} Due
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold">
                            <span>Gross Turnover</span>
                            <TrendingUp className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-1">
                            ₹{financialSummary.totalTurnover.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            Pre-discount subtotal
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold">
                            <span>Discounts</span>
                            <IndianRupee className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-1">
                            ₹{financialSummary.totalDiscount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            Total rebate granted
                        </div>
                    </div>

                    <div className="bg-blue-50/70 dark:bg-blue-900/30 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 text-xs font-bold">
                            <span>Net Billed (CA)</span>
                            <Building2 className="h-4 w-4 text-blue-700" />
                        </div>
                        <div className="text-xl font-black text-blue-800 dark:text-blue-300 mt-1">
                            ₹{financialSummary.totalNetBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] text-blue-700 dark:text-blue-400 mt-0.5 font-semibold">
                            Taxable Turnover Basis
                        </div>
                    </div>

                    <div className="bg-emerald-50/70 dark:bg-emerald-900/30 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                            <span>Total Collected</span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
                            ₹{financialSummary.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-semibold">
                            Cash / Bank Receipts
                        </div>
                    </div>

                    <div className="bg-red-50/70 dark:bg-red-900/30 p-3.5 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="flex items-center justify-between text-red-700 dark:text-red-300 text-xs font-bold">
                            <span>Outstanding Due</span>
                            <AlertCircle className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="text-xl font-black text-red-800 dark:text-red-300 mt-1">
                            ₹{financialSummary.totalBalanceDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] text-red-700 dark:text-red-400 mt-0.5 font-semibold">
                            Pending Receivables
                        </div>
                    </div>
                </div>

                {/* Tab Navigation for Table Views */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pt-2 print:hidden">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                                activeTab === 'invoices'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                        >
                            <FileText className="h-4 w-4" />
                            <span>Invoice Sales Schedule ({filteredInvoices.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('items')}
                            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                                activeTab === 'items'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                        >
                            <Package className="h-4 w-4" />
                            <span>Item-wise Sales Breakdown ({itemSalesSummary.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('customers')}
                            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                                activeTab === 'customers'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                        >
                            <Users className="h-4 w-4" />
                            <span>Customer Ledger / Receivables ({customerSummary.length})</span>
                        </button>
                    </div>

                    {/* Quick Search */}
                    <div className="relative mb-2">
                        <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search in report..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* TAB 1: Main Invoice Sales Schedule (CA Audit Format) */}
                {activeTab === 'invoices' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 font-bold border-y border-gray-200 dark:border-gray-700">
                                    <th className="py-2.5 px-2 text-center w-10">Sr.</th>
                                    <th className="py-2.5 px-3">Date</th>
                                    <th className="py-2.5 px-3">Invoice #</th>
                                    <th className="py-2.5 px-3">Customer Name</th>
                                    <th className="py-2.5 px-3">GSTIN</th>
                                    <th className="py-2.5 px-3 text-right">Gross (₹)</th>
                                    <th className="py-2.5 px-3 text-right">Discount (₹)</th>
                                    <th className="py-2.5 px-3 text-right font-black text-blue-700 dark:text-blue-400">Total (₹)</th>
                                    <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">Paid (₹)</th>
                                    <th className="py-2.5 px-3 text-right text-red-700 dark:text-red-400">Balance (₹)</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                    <th className="py-2.5 px-2 text-center print:hidden">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                {filteredInvoices.length > 0 ? (
                                    filteredInvoices.map((inv, index) => {
                                        const cust = customerMap.get(inv.customerId);
                                        const custName = convertLegacyMarathi(cust?.name || inv.customerName || 'Customer');
                                        const custGstin = cust?.gstin || inv.customerGstin || '-';

                                        const gross = (inv.items || []).reduce((sum, it) => sum + ((parseFloat(it.quantity) || 0) * (parseFloat(it.price) || 0)), 0);
                                        const discount = parseFloat(inv.discount) || 0;
                                        const net = parseFloat(inv.total) || Math.max(0, gross - discount);
                                        const paid = (inv.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) + (inv.status === 'Paid' && (!inv.payments || inv.payments.length === 0) ? net : 0);
                                        const bal = Math.max(0, net - paid);
                                        const isExpanded = expandedInvoiceId === inv.id;

                                        return (
                                            <>
                                                <tr
                                                    key={inv.id}
                                                    className={`hover:bg-blue-50/40 dark:hover:bg-gray-700/50 transition-colors ${
                                                        index % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
                                                    }`}
                                                >
                                                    <td className="py-2 px-2 text-center font-mono text-gray-500">
                                                        {index + 1}
                                                    </td>
                                                    <td className="py-2 px-3 whitespace-nowrap font-medium">
                                                        {inv.date ? format(new Date(inv.date), 'dd-MM-yyyy') : '-'}
                                                    </td>
                                                    <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                                        <Link to={`/invoices/${inv.id}`} className="hover:underline">
                                                            {inv.invoiceNumber}
                                                        </Link>
                                                    </td>
                                                    <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white max-w-[180px] truncate" title={custName}>
                                                        {custName}
                                                    </td>
                                                    <td className="py-2 px-3 font-mono text-[11px] text-gray-500">
                                                        {custGstin}
                                                    </td>
                                                    <td className="py-2 px-3 text-right">
                                                        ₹{gross.toFixed(2)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-gray-500">
                                                        {discount > 0 ? `-₹${discount.toFixed(2)}` : '-'}
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-bold text-gray-900 dark:text-white">
                                                        ₹{net.toFixed(2)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                                        ₹{paid.toFixed(2)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-bold text-red-600 dark:text-red-400">
                                                        ₹{bal.toFixed(2)}
                                                    </td>
                                                    <td className="py-2 px-3 text-center whitespace-nowrap">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                inv.status === 'Paid'
                                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                                                    : inv.status === 'Partial'
                                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                                    : inv.status === 'Draft'
                                                                    ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                                            }`}
                                                        >
                                                            {inv.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-2 text-center print:hidden">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
                                                                title={isExpanded ? 'Collapse Items' : 'View Items'}
                                                            >
                                                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                            </button>
                                                            <Link
                                                                to={`/invoices/${inv.id}`}
                                                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded text-blue-600"
                                                                title="Open Invoice"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expanded Line Items */}
                                                {isExpanded && (
                                                    <tr className="bg-blue-50/30 dark:bg-gray-900/40">
                                                        <td colSpan="12" className="p-3">
                                                            <div className="pl-6 border-l-2 border-blue-400 space-y-1">
                                                                <div className="text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                                    Item Breakdown for {inv.invoiceNumber}:
                                                                </div>
                                                                <table className="w-full max-w-2xl text-[11px]">
                                                                    <thead>
                                                                        <tr className="text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                                                            <th className="py-1 text-left">Item</th>
                                                                            <th className="py-1 text-center w-16">Qty</th>
                                                                            <th className="py-1 text-right w-24">Rate</th>
                                                                            <th className="py-1 text-right w-24">Line Total</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {(inv.items || []).map((it, i) => {
                                                                            const originalItem = itemMap.get(it.itemId);
                                                                            const itName = convertLegacyMarathi(originalItem?.name || it.name || 'Item');
                                                                            const lineAmt = (parseFloat(it.quantity) || 0) * (parseFloat(it.price) || 0);

                                                                            return (
                                                                                <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                                                                                    <td className="py-1 font-medium">{itName}</td>
                                                                                    <td className="py-1 text-center">{it.quantity}</td>
                                                                                    <td className="py-1 text-right">₹{parseFloat(it.price).toFixed(2)}</td>
                                                                                    <td className="py-1 text-right font-semibold">₹{lineAmt.toFixed(2)}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="12" className="py-10 text-center text-gray-500 dark:text-gray-400">
                                            No invoices found for the selected date range ({startDate} to {endDate}).
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredInvoices.length > 0 && (
                                <tfoot>
                                    <tr className="bg-gray-100 dark:bg-gray-700 font-extrabold text-gray-900 dark:text-white border-t-2 border-gray-300 dark:border-gray-600">
                                        <td colSpan="5" className="py-3 px-3 text-right uppercase tracking-wider text-xs">
                                            Grand Totals ({filteredInvoices.length} Invoices):
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            ₹{financialSummary.totalTurnover.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-3 text-right text-gray-500">
                                            ₹{financialSummary.totalDiscount.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-3 text-right text-blue-700 dark:text-blue-400 text-sm">
                                            ₹{financialSummary.totalNetBilled.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400 text-sm">
                                            ₹{financialSummary.totalPaid.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-3 text-right text-red-700 dark:text-red-400 text-sm">
                                            ₹{financialSummary.totalBalanceDue.toFixed(2)}
                                        </td>
                                        <td colSpan="2" className="py-3 px-3"></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}

                {/* TAB 2: Item-wise Sales Breakdown */}
                {activeTab === 'items' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 font-bold border-y border-gray-200 dark:border-gray-700">
                                    <th className="py-2.5 px-2 text-center w-10">Sr.</th>
                                    <th className="py-2.5 px-3">Item Name</th>
                                    <th className="py-2.5 px-3 text-center">Invoices Count</th>
                                    <th className="py-2.5 px-3 text-center">Total Qty Sold</th>
                                    <th className="py-2.5 px-3 text-right">Avg Rate (₹)</th>
                                    <th className="py-2.5 px-3 text-right font-black text-blue-700 dark:text-blue-400">Total Sales (₹)</th>
                                    <th className="py-2.5 px-3 text-right">Turnover Share</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                {itemSalesSummary.length > 0 ? (
                                    itemSalesSummary.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            className={`hover:bg-blue-50/40 dark:hover:bg-gray-700/50 ${
                                                index % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
                                            }`}
                                        >
                                            <td className="py-2 px-2 text-center font-mono text-gray-500">{index + 1}</td>
                                            <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white">
                                                {convertLegacyMarathi(item.name)}
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono">{item.invoiceOccurrences}</td>
                                            <td className="py-2 px-3 text-center font-bold">{item.totalQty}</td>
                                            <td className="py-2 px-3 text-right">₹{item.avgPrice.toFixed(2)}</td>
                                            <td className="py-2 px-3 text-right font-bold text-gray-900 dark:text-white">
                                                ₹{item.totalRevenue.toFixed(2)}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                                                {item.revenueShare}%
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="py-8 text-center text-gray-500">
                                            No item sales recorded in this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* TAB 3: Customer Receivables Ledger */}
                {activeTab === 'customers' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 font-bold border-y border-gray-200 dark:border-gray-700">
                                    <th className="py-2.5 px-2 text-center w-10">Sr.</th>
                                    <th className="py-2.5 px-3">Customer Name</th>
                                    <th className="py-2.5 px-3">GSTIN</th>
                                    <th className="py-2.5 px-3">Phone</th>
                                    <th className="py-2.5 px-3 text-center">Invoices</th>
                                    <th className="py-2.5 px-3 text-right font-bold">Total Billed (₹)</th>
                                    <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">Total Paid (₹)</th>
                                    <th className="py-2.5 px-3 text-right text-red-700 dark:text-red-400 font-black">Outstanding Due (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                                {customerSummary.length > 0 ? (
                                    customerSummary.map((cust, index) => (
                                        <tr
                                            key={cust.id}
                                            className={`hover:bg-blue-50/40 dark:hover:bg-gray-700/50 ${
                                                index % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
                                            }`}
                                        >
                                            <td className="py-2 px-2 text-center font-mono text-gray-500">{index + 1}</td>
                                            <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white">
                                                {convertLegacyMarathi(cust.name)}
                                            </td>
                                            <td className="py-2 px-3 font-mono text-[11px] text-gray-500">{cust.gstin}</td>
                                            <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{cust.phone}</td>
                                            <td className="py-2 px-3 text-center font-mono">{cust.invoicesCount}</td>
                                            <td className="py-2 px-3 text-right font-bold text-gray-900 dark:text-white">
                                                ₹{cust.totalBilled.toFixed(2)}
                                            </td>
                                            <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                                                ₹{cust.totalPaid.toFixed(2)}
                                            </td>
                                            <td className="py-2 px-3 text-right font-bold text-red-600 dark:text-red-400">
                                                ₹{cust.balanceDue.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="py-8 text-center text-gray-500">
                                            No customer data found in this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* CA Declaration & Signature Block */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs text-gray-500 dark:text-gray-400">
                    <div className="max-w-md space-y-1">
                        <div className="font-bold text-gray-700 dark:text-gray-300 uppercase">
                            Tax Compliance & Audit Notes:
                        </div>
                        <p>1. Shri Brahmchaitanya Enterprises operates under the GST Composition Scheme.</p>
                        <p>2. Composition taxable persons are not eligible to collect tax from recipients under GST Section 10.</p>
                        <p>3. Figures are compiled from genuine business sales invoices for CA financial audit.</p>
                    </div>

                    <div className="text-right min-w-[220px]">
                        <div className="text-gray-800 dark:text-gray-200 font-bold text-sm mb-12">
                            For Shri Brahmchaitanya Enterprises
                        </div>
                        <div className="border-t border-gray-400 dark:border-gray-500 pt-1.5 font-bold text-gray-700 dark:text-gray-300">
                            Authorized Signatory / Proprietor
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
