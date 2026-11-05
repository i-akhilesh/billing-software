import { useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import {
    X,
    Download,
    Printer,
    FileText,
    Check,
    Store,
    Settings2,
    Users,
    Filter,
    ArrowUpDown,
    CheckSquare,
    ZoomIn,
    ZoomOut,
    Eye,
    Sparkles
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { paginateCatalogItems, generatePriceListPDF } from '../utils/priceListPdfGenerator';

const DEFAULT_STORES = {
    store1: {
        id: 'store1',
        name: 'Shri Brahmchaitanya Enterprises',
        address: 'N-11, B 19/4, Subhashchandra Bose Nagar, Hudco, Chh. Sambhaji Nagar, 431003',
        phone: '+91 81809 19544',
        gstin: '27AWRPP6364M1ZI',
        uniqueCode: 'VAMHAU00097869',
        tagline: 'General Suppliers • Educational Material • Stationery & Office Goods'
    },
    store2: {
        id: 'store2',
        name: 'चैतन्य साहित्य भांडार',
        address: '८८ व्ही. न-९, रंजनवन हाऊसिंग सोसायटी, शरद हॉटेल समोर, छत्रपती संभाजीनगर.',
        phone: '९६७३००९९३५',
        gstin: '',
        uniqueCode: '',
        tagline: 'शैक्षणिक साहित्य व स्टेशनरी विक्रेते'
    },
    store3: {
        id: 'store3',
        name: 'गुरुकृपा एंटरप्राइजेस',
        address: 'एन-११, बी- २०/३, हडको, छत्रपती संभाजीनगर.',
        phone: '९६७३०९०९४७',
        gstin: '',
        uniqueCode: '',
        tagline: 'सर्व प्रकारचे स्टेशनरी व कार्यालयीन साहित्य पुरवठादार'
    }
};

const PriceListModal = ({ isOpen, onClose, items = [], customers = [] }) => {
    const { addToast } = useToast();
    const printableContainerRef = useRef(null);

    // Customization States
    const [selectedStoreKey, setSelectedStoreKey] = useState('store1');
    const [documentTitle, setDocumentTitle] = useState('PRODUCT CATALOG & PRICE LIST');
    const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'all', 'inStock'
    const [sortBy, setSortBy] = useState('name-asc'); // 'name-asc', 'price-asc', 'price-desc', 'sku'

    // Column Toggles
    const [includeSku, setIncludeSku] = useState(true);
    const [includePrice, setIncludePrice] = useState(true);
    const [includeEmptyQty, setIncludeEmptyQty] = useState(true);
    const [includeRemarks, setIncludeRemarks] = useState(true);
    const [includeTaxRate, setIncludeTaxRate] = useState(false);

    // Customer Detail Header
    const [includeCustomerBox, setIncludeCustomerBox] = useState(true);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');

    // Instructions and Terms
    const [instructionsText, setInstructionsText] = useState(
        'Please enter required quantity in the "Order Qty" column and return this sheet via WhatsApp or hand delivery.'
    );
    const [termsText, setTermsText] = useState(
        'Prices are inclusive of applicable taxes. Order delivery within 2-3 business days. Rates valid for 30 days.'
    );
    const [includeSignatures, setIncludeSignatures] = useState(true);

    // Zoom & UI state
    const [zoomLevel, setZoomLevel] = useState(0.85);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
    const [activeTab, setActiveTab] = useState('customization'); // 'customization' or 'preview'

    const selectedStore = DEFAULT_STORES[selectedStoreKey] || DEFAULT_STORES.store1;

    // Handle customer selection pre-fill
    const handleCustomerChange = (custId) => {
        setSelectedCustomerId(custId);
        if (!custId) {
            setCustomerName('');
            setCustomerPhone('');
            setCustomerAddress('');
            return;
        }
        const cust = customers.find(c => c.id === custId);
        if (cust) {
            setCustomerName(cust.name || '');
            setCustomerPhone(cust.phone || cust.mobile || '');
            setCustomerAddress(cust.address || '');
        }
    };

    // Filter and Sort Items
    const processedItems = useMemo(() => {
        let list = [...(items || [])];

        // Filter
        if (statusFilter === 'active') {
            list = list.filter(i => (i.status || 'active').toLowerCase() === 'active');
        } else if (statusFilter === 'inStock') {
            list = list.filter(i => (parseFloat(i.stock) || 0) > 0);
        }

        // Sort
        list.sort((a, b) => {
            if (sortBy === 'name-asc') {
                return (a.name || '').localeCompare(b.name || '');
            } else if (sortBy === 'price-asc') {
                return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
            } else if (sortBy === 'price-desc') {
                return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
            } else if (sortBy === 'sku') {
                return (a.sku || '').localeCompare(b.sku || '');
            }
            return 0;
        });

        return list;
    }, [items, statusFilter, sortBy]);

    // Paginated pages for A4 layout
    const pages = useMemo(() => {
        return paginateCatalogItems(processedItems, {
            includeCustomerBox,
            includeInstructions: true,
            includeSignatures
        });
    }, [processedItems, includeCustomerBox, includeSignatures]);

    // PDF Download Handler
    const handleDownloadPDF = async () => {
        if (!printableContainerRef.current) return;
        setIsGenerating(true);
        setGenerationProgress({ current: 0, total: pages.length });

        try {
            const dateStr = format(new Date(), 'dd-MM-yyyy');
            const sanitizedStore = selectedStore.name.replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `Price_List_Order_Sheet_${sanitizedStore}_${dateStr}.pdf`;

            await generatePriceListPDF(
                printableContainerRef.current,
                filename,
                (current, total) => setGenerationProgress({ current, total })
            );

            addToast('Price List PDF downloaded successfully!', 'success');
        } catch (error) {
            console.error('Failed to generate Price List PDF:', error);
            addToast(`Error generating PDF: ${error.message || String(error)}`, 'error');
        } finally {
            setIsGenerating(false);
            setGenerationProgress({ current: 0, total: 0 });
        }
    };

    // Direct Browser Print
    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-hidden print:static print:inset-auto print:p-0 print:bg-white print:z-auto print:block">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in duration-200 print:h-auto print:max-w-none print:shadow-none print:border-none print:rounded-none">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 flex-shrink-0 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Download Price List & Customer Order Sheet
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                                    {processedItems.length} Items • {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
                                </span>
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Generates a professional catalog with an empty "Order Qty" column for customers to fill out their orders.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Tab toggle for small screens */}
                        <div className="flex sm:hidden bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5 text-xs">
                            <button
                                onClick={() => setActiveTab('customization')}
                                className={`px-3 py-1.5 rounded-md font-medium ${activeTab === 'customization' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
                            >
                                Settings
                            </button>
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={`px-3 py-1.5 rounded-md font-medium ${activeTab === 'preview' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
                            >
                                Preview
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Body: Two column layout */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Customization Controls */}
                    <div className={`w-full sm:w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto p-5 space-y-5 text-sm print:hidden ${activeTab === 'preview' ? 'hidden sm:block' : 'block'}`}>
                        {/* Store Selection */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                                <Store className="h-4 w-4 text-blue-600" />
                                Store Profile
                            </label>
                            <select
                                value={selectedStoreKey}
                                onChange={(e) => setSelectedStoreKey(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 text-xs"
                            >
                                <option value="store1">Shri Brahmchaitanya Enterprises</option>
                                <option value="store2">चैतन्य साहित्य भांडार</option>
                                <option value="store3">गुरुकृपा एंटरप्राइजेस</option>
                            </select>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                Phone: {selectedStore.phone} • {selectedStore.gstin ? `GSTIN: ${selectedStore.gstin}` : 'No GST'}
                            </p>
                        </div>

                        {/* Title and Subtitle */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                                <Settings2 className="h-4 w-4 text-blue-600" />
                                Document Heading
                            </label>
                            <input
                                type="text"
                                value={documentTitle}
                                onChange={(e) => setDocumentTitle(e.target.value)}
                                placeholder="PRODUCT CATALOG & PRICE LIST"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                            />
                        </div>

                        {/* Filter & Sorting */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                                <Filter className="h-4 w-4 text-blue-600" />
                                Items Filter & Sorting
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">Status</span>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                    >
                                        <option value="active">Active Only</option>
                                        <option value="inStock">In Stock Only</option>
                                        <option value="all">All Items</option>
                                    </select>
                                </div>
                                <div>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">Sort Order</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                    >
                                        <option value="name-asc">Name (A → Z)</option>
                                        <option value="price-asc">Price (Low → High)</option>
                                        <option value="price-desc">Price (High → Low)</option>
                                        <option value="sku">SKU / Code</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Columns Toggles */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                                Table Columns
                            </label>
                            <div className="space-y-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeEmptyQty}
                                        onChange={(e) => setIncludeEmptyQty(e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                        Empty "Order Qty" Column (for customer fill-in)
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includePrice}
                                        onChange={(e) => setIncludePrice(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Unit Price Column (₹)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeSku}
                                        onChange={(e) => setIncludeSku(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>SKU / Product Code Column</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeRemarks}
                                        onChange={(e) => setIncludeRemarks(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Remarks / Notes Line Column</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeTaxRate}
                                        onChange={(e) => setIncludeTaxRate(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Tax Rate % Column</span>
                                </label>
                            </div>
                        </div>

                        {/* Customer Order Details Box */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                                    <Users className="h-4 w-4 text-blue-600" />
                                    Customer Info Header
                                </label>
                                <input
                                    type="checkbox"
                                    checked={includeCustomerBox}
                                    onChange={(e) => setIncludeCustomerBox(e.target.checked)}
                                    className="rounded text-blue-600"
                                />
                            </div>

                            {includeCustomerBox && (
                                <div className="space-y-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 text-xs">
                                    <div>
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">
                                            Pre-fill Customer (Optional)
                                        </span>
                                        <select
                                            value={selectedCustomerId}
                                            onChange={(e) => handleCustomerChange(e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                        >
                                            <option value="">-- Blank Lines (For Any Customer to Fill) --</option>
                                            {(customers || []).map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Customer / School Name (blank for line)"
                                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            placeholder="Contact Person / Mobile Number"
                                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Instructions and Terms */}
                        <div className="space-y-2">
                            <label className="font-semibold text-gray-800 dark:text-gray-200 block text-xs">
                                Order Instructions Note
                            </label>
                            <textarea
                                value={instructionsText}
                                onChange={(e) => setInstructionsText(e.target.value)}
                                rows="2"
                                className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                            />
                        </div>

                        {/* Signatures & Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Include Signatures & Terms Box
                            </span>
                            <input
                                type="checkbox"
                                checked={includeSignatures}
                                onChange={(e) => setIncludeSignatures(e.target.checked)}
                                className="rounded text-blue-600"
                            />
                        </div>
                    </div>

                    {/* Right: Live Interactive A4 Document Preview */}
                    <div className={`flex-1 bg-gray-100 dark:bg-gray-900 flex flex-col overflow-hidden print:bg-white print:overflow-visible ${activeTab === 'customization' ? 'hidden sm:flex' : 'flex'}`}>
                        {/* Preview Topbar Controls */}
                        <div className="px-6 py-2.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 print:hidden">
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 font-medium">
                                <Eye className="h-4 w-4 text-emerald-600" />
                                Document Preview ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                    <button
                                        onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                                        className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
                                        title="Zoom Out"
                                    >
                                        <ZoomOut className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="text-xs font-mono px-2 text-gray-700 dark:text-gray-200">
                                        {Math.round(zoomLevel * 100)}%
                                    </span>
                                    <button
                                        onClick={() => setZoomLevel(prev => Math.min(1.3, prev + 0.1))}
                                        className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
                                        title="Zoom In"
                                    >
                                        <ZoomIn className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Container containing rendered A4 Pages */}
                        <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-8 print:p-0 print:overflow-visible print:bg-white print:gap-0">
                            <div
                                ref={printableContainerRef}
                                className="flex flex-col items-center gap-8 origin-top transition-transform print:gap-0 print:transform-none"
                                style={{ transform: `scale(${zoomLevel})` }}
                            >
                                {pages.map((page, pageIdx) => {
                                    // Calculate starting serial index for continuous numbering
                                    const startingIndex = pages
                                        .slice(0, pageIdx)
                                        .reduce((acc, p) => acc + p.items.length, 0);

                                    return (
                                        <div
                                            key={pageIdx}
                                            className="catalog-pdf-page bg-white shadow-xl text-gray-900 border border-gray-300 print:border-none print:shadow-none"
                                            style={{
                                                width: '794px',
                                                height: '1123px',
                                                maxHeight: '1123px',
                                                minHeight: '1123px',
                                                boxSizing: 'border-box',
                                                padding: '28px 34px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                backgroundColor: '#ffffff',
                                                color: '#0f172a',
                                                fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                                            }}
                                        >
                                            {/* Top Section */}
                                            <div>
                                                {/* Page 1 Header */}
                                                {page.isFirstPage ? (
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'flex-start',
                                                        borderBottom: '2.5px solid #1e40af',
                                                        paddingBottom: '12px',
                                                        marginBottom: '10px'
                                                    }}>
                                                        <div style={{ flex: 1, paddingRight: '20px' }}>
                                                            <h1 style={{
                                                                fontSize: '22px',
                                                                fontWeight: '800',
                                                                color: '#1e40af',
                                                                margin: '0 0 2px 0',
                                                                letterSpacing: '-0.2px'
                                                            }}>
                                                                {selectedStore.name}
                                                            </h1>
                                                            <div style={{
                                                                fontSize: '10px',
                                                                color: '#047857',
                                                                fontWeight: '600',
                                                                marginBottom: '3px'
                                                            }}>
                                                                {selectedStore.tagline}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '10px',
                                                                color: '#475569',
                                                                lineHeight: '1.35',
                                                                maxWidth: '430px'
                                                            }}>
                                                                {selectedStore.address}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '10px',
                                                                fontWeight: '600',
                                                                color: '#1e293b',
                                                                marginTop: '4px',
                                                                display: 'flex',
                                                                gap: '12px'
                                                            }}>
                                                                <span>📞 Mob: {selectedStore.phone}</span>
                                                                {selectedStore.gstin && (
                                                                    <span>GSTIN: {selectedStore.gstin}</span>
                                                                )}
                                                                {selectedStore.uniqueCode && (
                                                                    <span>Code: {selectedStore.uniqueCode}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div style={{
                                                            textAlign: 'right',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'flex-end',
                                                            minWidth: '220px'
                                                        }}>
                                                            <div style={{
                                                                backgroundColor: '#1e40af',
                                                                color: '#ffffff',
                                                                padding: '5px 14px',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                letterSpacing: '0.4px',
                                                                textTransform: 'uppercase',
                                                                marginBottom: '5px'
                                                            }}>
                                                                {documentTitle}
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: '#475569' }}>
                                                                Date of Issue: <strong>{format(new Date(), 'dd-MM-yyyy')}</strong>
                                                            </div>
                                                            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                                                                Rate Card Valid As Of: {format(new Date(), 'MMMM yyyy')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Running header on page 2+ */
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        borderBottom: '1.5px solid #cbd5e1',
                                                        paddingBottom: '6px',
                                                        marginBottom: '10px',
                                                        fontSize: '10px',
                                                        color: '#475569'
                                                    }}>
                                                        <div style={{ fontWeight: 'bold', color: '#1e40af' }}>
                                                            {selectedStore.name} • {documentTitle}
                                                        </div>
                                                        <div>
                                                            Date: {format(new Date(), 'dd-MM-yyyy')} | Page {page.pageNumber} of {page.totalPages}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Customer Order Details Box (on Page 1) */}
                                                {page.isFirstPage && page.showCustomerBox && (
                                                    <div style={{
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '6px',
                                                        padding: '8px 12px',
                                                        marginBottom: '8px',
                                                        backgroundColor: '#f8fafc'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '9.5px',
                                                            fontWeight: 'bold',
                                                            color: '#1e40af',
                                                            textTransform: 'uppercase',
                                                            marginBottom: '5px',
                                                            letterSpacing: '0.5px',
                                                            display: 'flex',
                                                            justifyContent: 'space-between'
                                                        }}>
                                                            <span>Customer Order Details (Please fill in or verify)</span>
                                                            <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 'normal' }}>
                                                                Order Reference / PO No: ____________________
                                                            </span>
                                                        </div>
                                                        <div style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: '1.4fr 1fr',
                                                            gap: '5px 16px',
                                                            fontSize: '10.5px',
                                                            color: '#1e293b'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                                <span style={{ fontWeight: 600, color: '#475569', minWidth: '95px' }}>
                                                                    Customer Name:
                                                                </span>
                                                                <span style={{
                                                                    borderBottom: '1px dotted #94a3b8',
                                                                    flex: 1,
                                                                    height: '16px',
                                                                    display: 'inline-block',
                                                                    fontWeight: customerName ? '600' : 'normal'
                                                                }}>
                                                                    {customerName || ''}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                                <span style={{ fontWeight: 600, color: '#475569', minWidth: '75px' }}>
                                                                    Contact No:
                                                                </span>
                                                                <span style={{
                                                                    borderBottom: '1px dotted #94a3b8',
                                                                    flex: 1,
                                                                    height: '16px',
                                                                    display: 'inline-block'
                                                                }}>
                                                                    {customerPhone || ''}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                                <span style={{ fontWeight: 600, color: '#475569', minWidth: '95px' }}>
                                                                    Delivery Address:
                                                                </span>
                                                                <span style={{
                                                                    borderBottom: '1px dotted #94a3b8',
                                                                    flex: 1,
                                                                    height: '16px',
                                                                    display: 'inline-block'
                                                                }}>
                                                                    {customerAddress || ''}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                                <span style={{ fontWeight: 600, color: '#475569', minWidth: '75px' }}>
                                                                    Required Date:
                                                                </span>
                                                                <span style={{
                                                                    borderBottom: '1px dotted #94a3b8',
                                                                    flex: 1,
                                                                    height: '16px',
                                                                    display: 'inline-block'
                                                                }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Instructions Callout Box (on Page 1) */}
                                                {page.isFirstPage && page.showInstructions && (
                                                    <div style={{
                                                        backgroundColor: '#eff6ff',
                                                        borderLeft: '3.5px solid #2563eb',
                                                        borderRadius: '4px',
                                                        padding: '5px 10px',
                                                        marginBottom: '8px',
                                                        fontSize: '9.5px',
                                                        color: '#1e3a8a',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}>
                                                        <span style={{ fontWeight: 'bold' }}>✍️ How to Order:</span>
                                                        <span>{instructionsText}</span>
                                                    </div>
                                                )}

                                                {/* Items Table */}
                                                <table style={{
                                                    width: '100%',
                                                    borderCollapse: 'collapse',
                                                    textAlign: 'left'
                                                }}>
                                                    <thead>
                                                        <tr style={{
                                                            backgroundColor: '#1e3a8a',
                                                            color: '#ffffff',
                                                            fontSize: '9.5px',
                                                            fontWeight: '700',
                                                            letterSpacing: '0.3px',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            <th style={{
                                                                padding: '6px 6px',
                                                                textAlign: 'center',
                                                                width: '32px',
                                                                borderRight: '1px solid #3b82f6'
                                                            }}>
                                                                Sr.
                                                            </th>
                                                            <th style={{
                                                                padding: '6px 10px',
                                                                textAlign: 'left',
                                                                borderRight: '1px solid #3b82f6'
                                                            }}>
                                                                Item Description / Product Name
                                                            </th>
                                                            {includeSku && (
                                                                <th style={{
                                                                    padding: '6px 8px',
                                                                    textAlign: 'center',
                                                                    width: '80px',
                                                                    borderRight: '1px solid #3b82f6'
                                                                }}>
                                                                    SKU / Code
                                                                </th>
                                                            )}
                                                            {includeTaxRate && (
                                                                <th style={{
                                                                    padding: '6px 6px',
                                                                    textAlign: 'center',
                                                                    width: '55px',
                                                                    borderRight: '1px solid #3b82f6'
                                                                }}>
                                                                    Tax %
                                                                </th>
                                                            )}
                                                            {includePrice && (
                                                                <th style={{
                                                                    padding: '6px 10px',
                                                                    textAlign: 'right',
                                                                    width: '90px',
                                                                    borderRight: '1px solid #3b82f6'
                                                                }}>
                                                                    Price (₹)
                                                                </th>
                                                            )}
                                                            {includeEmptyQty && (
                                                                <th style={{
                                                                    padding: '6px 8px',
                                                                    textAlign: 'center',
                                                                    width: '105px',
                                                                    backgroundColor: '#1d4ed8',
                                                                    color: '#ffffff',
                                                                    borderRight: includeRemarks ? '1px solid #3b82f6' : 'none'
                                                                }}>
                                                                    Order Qty <span style={{ fontSize: '8px', opacity: 0.9 }}>[Fill]</span>
                                                                </th>
                                                            )}
                                                            {includeRemarks && (
                                                                <th style={{
                                                                    padding: '6px 8px',
                                                                    textAlign: 'left',
                                                                    width: '110px'
                                                                }}>
                                                                    Customer Remarks
                                                                </th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {page.items.map((item, idx) => {
                                                            const itemSr = startingIndex + idx + 1;
                                                            const isEven = idx % 2 === 0;

                                                            return (
                                                                <tr
                                                                    key={item.id || idx}
                                                                    style={{
                                                                        backgroundColor: isEven ? '#ffffff' : '#f8fafc',
                                                                        borderBottom: '1px solid #e2e8f0',
                                                                        fontSize: '10px'
                                                                    }}
                                                                >
                                                                    <td style={{
                                                                        padding: '4px 6px',
                                                                        textAlign: 'center',
                                                                        color: '#64748b',
                                                                        fontFamily: 'monospace',
                                                                        fontSize: '9.5px',
                                                                        borderRight: '1px solid #f1f5f9'
                                                                    }}>
                                                                        {itemSr}
                                                                    </td>
                                                                    <td style={{
                                                                        padding: '4px 10px',
                                                                        color: '#0f172a',
                                                                        fontWeight: '500',
                                                                        borderRight: '1px solid #f1f5f9'
                                                                    }}>
                                                                        <div style={{ fontWeight: '600' }}>{item.name}</div>
                                                                        {item.description && (
                                                                            <div style={{
                                                                                fontSize: '8.5px',
                                                                                color: '#64748b',
                                                                                marginTop: '1px',
                                                                                lineHeight: '1.2'
                                                                            }}>
                                                                                {item.description}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    {includeSku && (
                                                                        <td style={{
                                                                            padding: '4px 8px',
                                                                            textAlign: 'center',
                                                                            color: '#475569',
                                                                            fontSize: '9px',
                                                                            fontFamily: 'monospace',
                                                                            borderRight: '1px solid #f1f5f9'
                                                                        }}>
                                                                            {item.sku || '-'}
                                                                        </td>
                                                                    )}
                                                                    {includeTaxRate && (
                                                                        <td style={{
                                                                            padding: '4px 6px',
                                                                            textAlign: 'center',
                                                                            color: '#475569',
                                                                            fontSize: '9.5px',
                                                                            borderRight: '1px solid #f1f5f9'
                                                                        }}>
                                                                            {item.taxRate ? `${item.taxRate}%` : '0%'}
                                                                        </td>
                                                                    )}
                                                                    {includePrice && (
                                                                        <td style={{
                                                                            padding: '4px 10px',
                                                                            textAlign: 'right',
                                                                            color: '#0f172a',
                                                                            fontWeight: '700',
                                                                            fontSize: '10.5px',
                                                                            borderRight: '1px solid #f1f5f9'
                                                                        }}>
                                                                            ₹{parseFloat(item.price || 0).toFixed(2)}
                                                                        </td>
                                                                    )}
                                                                    {includeEmptyQty && (
                                                                        <td style={{
                                                                            padding: '3px 8px',
                                                                            textAlign: 'center',
                                                                            borderRight: includeRemarks ? '1px solid #f1f5f9' : 'none'
                                                                        }}>
                                                                            {/* Customer fill-in empty box */}
                                                                            <div style={{
                                                                                height: '22px',
                                                                                border: '1.5px dashed #94a3b8',
                                                                                borderRadius: '4px',
                                                                                backgroundColor: '#ffffff',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center'
                                                                            }} />
                                                                        </td>
                                                                    )}
                                                                    {includeRemarks && (
                                                                        <td style={{ padding: '3px 8px' }}>
                                                                            <div style={{
                                                                                borderBottom: '1px dotted #cbd5e1',
                                                                                height: '18px'
                                                                            }} />
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Bottom Section */}
                                            <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                                                {/* Terms & Signatures (shown on the last page) */}
                                                {page.isLastPage && page.showSignatures && (
                                                    <div style={{
                                                        borderTop: '1px solid #cbd5e1',
                                                        paddingTop: '8px',
                                                        marginBottom: '10px'
                                                    }}>
                                                        {/* Terms & Instructions Grid */}
                                                        <div style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: '1.2fr 1fr',
                                                            gap: '12px',
                                                            marginBottom: '12px',
                                                            fontSize: '9px',
                                                            color: '#475569'
                                                        }}>
                                                            <div>
                                                                <div style={{
                                                                    fontWeight: 'bold',
                                                                    color: '#1e40af',
                                                                    marginBottom: '2px',
                                                                    textTransform: 'uppercase',
                                                                    fontSize: '8.5px'
                                                                }}>
                                                                    Terms & Conditions:
                                                                </div>
                                                                <div style={{ lineHeight: '1.35' }}>
                                                                    {termsText}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div style={{
                                                                    fontWeight: 'bold',
                                                                    color: '#1e40af',
                                                                    marginBottom: '2px',
                                                                    textTransform: 'uppercase',
                                                                    fontSize: '8.5px'
                                                                }}>
                                                                    Contact & WhatsApp Order:
                                                                </div>
                                                                <div style={{ lineHeight: '1.35' }}>
                                                                    Send photo of this filled sheet to <strong>{selectedStore.phone}</strong>. We will confirm your order and issue your official tax invoice immediately.
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Signatures & Stamps */}
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'flex-end',
                                                            padding: '0 8px 4px 8px'
                                                        }}>
                                                            <div style={{ textAlign: 'center', width: '220px' }}>
                                                                <div style={{ height: '36px' }} />
                                                                <div style={{
                                                                    borderTop: '1px solid #0f172a',
                                                                    paddingTop: '3px',
                                                                    fontWeight: 'bold',
                                                                    fontSize: '9.5px',
                                                                    color: '#0f172a'
                                                                }}>
                                                                    Customer / Purchaser Signature
                                                                </div>
                                                                <div style={{ fontSize: '8.5px', color: '#64748b' }}>
                                                                    With Official Seal & Date
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'center', width: '240px' }}>
                                                                <div style={{
                                                                    fontSize: '9.5px',
                                                                    fontWeight: 'bold',
                                                                    color: '#1e40af',
                                                                    marginBottom: '32px'
                                                                }}>
                                                                    For {selectedStore.name}
                                                                </div>
                                                                <div style={{
                                                                    borderTop: '1px solid #0f172a',
                                                                    paddingTop: '3px',
                                                                    fontWeight: 'bold',
                                                                    fontSize: '9.5px',
                                                                    color: '#0f172a'
                                                                }}>
                                                                    Authorized Signatory
                                                                </div>
                                                                <div style={{ fontSize: '8.5px', color: '#64748b' }}>
                                                                    Proprietor / Sales Manager
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Page Bottom Running Footer */}
                                                <div style={{
                                                    borderTop: '1px solid #e2e8f0',
                                                    paddingTop: '4px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: '8.5px',
                                                    color: '#94a3b8'
                                                }}>
                                                    <div>
                                                        <strong>{selectedStore.name}</strong> • Phone: {selectedStore.phone} • Chh. Sambhaji Nagar
                                                    </div>
                                                    <div>
                                                        Page {page.pageNumber} of {page.totalPages}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="px-6 py-3.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 print:hidden">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {isGenerating ? (
                            <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent rounded-full" />
                                Generating Page {generationProgress.current} of {generationProgress.total}...
                            </span>
                        ) : (
                            <span>
                                Ready to download: <strong>{processedItems.length} products</strong> formatted into <strong>{pages.length} A4 {pages.length === 1 ? 'page' : 'pages'}</strong>.
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isGenerating}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={isGenerating}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-xs font-medium"
                            title="Direct print to printer or browser PDF"
                        >
                            <Printer className="h-4 w-4" />
                            Print
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadPDF}
                            disabled={isGenerating || processedItems.length === 0}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg flex items-center gap-2 shadow-md transition-colors text-xs font-semibold"
                        >
                            {isGenerating ? (
                                <>
                                    <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    Creating PDF ({generationProgress.current}/{generationProgress.total})...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    Download Price List PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PriceListModal;
