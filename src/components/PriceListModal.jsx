import { useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import {
    X,
    Download,
    Printer,
    FileText,
    Store,
    Settings2,
    Users,
    Filter,
    CheckSquare,
    ZoomIn,
    ZoomOut,
    Eye,
    Maximize2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
    paginateCatalogItems,
    generatePriceListPDF,
    printCatalogViaIframe
} from '../utils/priceListPdfGenerator';

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
    const exportContainerRef = useRef(null);

    // Customization States
    const [selectedStoreKey, setSelectedStoreKey] = useState('store1');
    const [documentTitle, setDocumentTitle] = useState('PRODUCT CATALOG & PRICE LIST');
    const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'all', 'inStock'
    const [sortBy, setSortBy] = useState('name-asc'); // 'name-asc', 'price-asc', 'price-desc', 'sku'
    const [density, setDensity] = useState('standard'); // 'standard', 'compact', 'comfortable'

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

    // Preview zoom & state
    const [zoomLevel, setZoomLevel] = useState(0.8);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
    const [activeTab, setActiveTab] = useState('customization'); // mobile toggle

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

        if (statusFilter === 'active') {
            list = list.filter(i => (i.status || 'active').toLowerCase() === 'active');
        } else if (statusFilter === 'inStock') {
            list = list.filter(i => (parseFloat(i.stock) || 0) > 0);
        }

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

    // Paginated pages calibrated for A4
    const pages = useMemo(() => {
        return paginateCatalogItems(processedItems, {
            includeCustomerBox,
            includeInstructions: true,
            includeSignatures,
            density
        });
    }, [processedItems, includeCustomerBox, includeSignatures, density]);

    // PDF Download Handler (uses unscaled off-screen export container)
    const handleDownloadPDF = async () => {
        if (!exportContainerRef.current) return;
        setIsGenerating(true);
        setGenerationProgress({ current: 0, total: pages.length });

        try {
            const dateStr = format(new Date(), 'dd-MM-yyyy');
            const sanitizedStore = selectedStore.name.replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `Price_List_Order_Sheet_${sanitizedStore}_${dateStr}.pdf`;

            await generatePriceListPDF(
                exportContainerRef.current,
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

    // Direct Print Handler (prints isolated iframe content)
    const handlePrint = () => {
        if (!exportContainerRef.current) return;
        printCatalogViaIframe(exportContainerRef.current, `${documentTitle} - ${selectedStore.name}`);
    };

    // Reusable Page Component (used in both live preview and unscaled export container)
    const renderPageContent = (page, pageIdx, isPreview = false) => {
        const startingIndex = pages
            .slice(0, pageIdx)
            .reduce((acc, p) => acc + p.items.length, 0);

        // Density styling variables
        const rowPaddingY = density === 'compact' ? '3px' : density === 'comfortable' ? '6px' : '4px';
        const fontSizeBody = density === 'compact' ? '9.5px' : '10.5px';
        const boxHeight = density === 'compact' ? '20px' : '24px';

        return (
            <div
                key={pageIdx}
                className="catalog-pdf-page bg-white text-gray-900"
                style={{
                    width: '794px',
                    minHeight: pages.length === 1 ? 'auto' : '1123px',
                    boxSizing: 'border-box',
                    padding: '24px 30px',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    margin: isPreview ? '0 auto 24px auto' : '0',
                    boxShadow: isPreview ? '0 10px 25px -5px rgba(0,0,0,0.1)' : 'none',
                    border: isPreview ? '1px solid #e2e8f0' : 'none'
                }}
            >
                {/* 1. Page Header */}
                {page.isFirstPage ? (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '2.5px solid #1e40af',
                        paddingBottom: '10px',
                        marginBottom: '10px'
                    }}>
                        <div style={{ flex: 1, paddingRight: '16px' }}>
                            <h1 style={{
                                fontSize: '20px',
                                fontWeight: '800',
                                color: '#1e40af',
                                margin: '0 0 2px 0',
                                letterSpacing: '-0.2px'
                            }}>
                                {selectedStore.name}
                            </h1>
                            <div style={{
                                fontSize: '9.5px',
                                color: '#047857',
                                fontWeight: '600',
                                marginBottom: '2px'
                            }}>
                                {selectedStore.tagline}
                            </div>
                            <div style={{
                                fontSize: '9.5px',
                                color: '#475569',
                                lineHeight: '1.35',
                                maxWidth: '440px'
                            }}>
                                {selectedStore.address}
                            </div>
                            <div style={{
                                fontSize: '9.5px',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginTop: '4px',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <span>📞 Mob: {selectedStore.phone}</span>
                                {selectedStore.gstin && <span>GSTIN: {selectedStore.gstin}</span>}
                                {selectedStore.uniqueCode && <span>Code: {selectedStore.uniqueCode}</span>}
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
                                padding: '5px 12px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                letterSpacing: '0.4px',
                                textTransform: 'uppercase',
                                marginBottom: '4px'
                            }}>
                                {documentTitle}
                            </div>
                            <div style={{ fontSize: '9.5px', color: '#475569' }}>
                                Date: <strong>{format(new Date(), 'dd-MM-yyyy')}</strong>
                            </div>
                            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '1px' }}>
                                Ref: Rate Card • {format(new Date(), 'MMMM yyyy')}
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
                        paddingBottom: '5px',
                        marginBottom: '8px',
                        fontSize: '9.5px',
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

                {/* 2. Customer Order Details Form Box (Page 1) */}
                {page.isFirstPage && page.showCustomerBox && (
                    <div style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        padding: '6px 10px',
                        marginBottom: '8px',
                        backgroundColor: '#f8fafc'
                    }}>
                        <div style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            color: '#1e40af',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                            letterSpacing: '0.5px',
                            display: 'flex',
                            justifyContent: 'space-between'
                        }}>
                            <span>Customer Order Details (Please fill in or verify)</span>
                            <span style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 'normal' }}>
                                Order / PO Ref No: ____________________
                            </span>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1.4fr 1fr',
                            gap: '4px 14px',
                            fontSize: '10px',
                            color: '#1e293b'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontWeight: 600, color: '#475569', minWidth: '92px' }}>Customer Name:</span>
                                <span style={{
                                    borderBottom: '1px dotted #94a3b8',
                                    flex: 1,
                                    height: '15px',
                                    display: 'inline-block',
                                    fontWeight: customerName ? '600' : 'normal'
                                }}>
                                    {customerName || ''}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontWeight: 600, color: '#475569', minWidth: '70px' }}>Contact No:</span>
                                <span style={{
                                    borderBottom: '1px dotted #94a3b8',
                                    flex: 1,
                                    height: '15px',
                                    display: 'inline-block'
                                }}>
                                    {customerPhone || ''}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontWeight: 600, color: '#475569', minWidth: '92px' }}>Delivery Address:</span>
                                <span style={{
                                    borderBottom: '1px dotted #94a3b8',
                                    flex: 1,
                                    height: '15px',
                                    display: 'inline-block'
                                }}>
                                    {customerAddress || ''}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontWeight: 600, color: '#475569', minWidth: '70px' }}>Target Date:</span>
                                <span style={{
                                    borderBottom: '1px dotted #94a3b8',
                                    flex: 1,
                                    height: '15px',
                                    display: 'inline-block'
                                }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Instructions Callout (Page 1) */}
                {page.isFirstPage && page.showInstructions && (
                    <div style={{
                        backgroundColor: '#eff6ff',
                        borderLeft: '3.5px solid #2563eb',
                        borderRadius: '3px',
                        padding: '4px 8px',
                        marginBottom: '8px',
                        fontSize: '9px',
                        color: '#1e3a8a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span style={{ fontWeight: 'bold' }}>✍️ How to Order:</span>
                        <span>{instructionsText}</span>
                    </div>
                )}

                {/* 4. Perfectly Aligned Table with <colgroup> & tableLayout: fixed */}
                <table style={{
                    width: '100%',
                    tableLayout: 'fixed',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    border: '1.5px solid #334155',
                    fontSize: fontSizeBody
                }}>
                    <colgroup>
                        <col style={{ width: '38px' }} /> {/* Sr. */}
                        <col style={{ width: 'auto' }} /> {/* Description */}
                        {includeSku && <col style={{ width: '85px' }} />} {/* SKU */}
                        {includeTaxRate && <col style={{ width: '60px' }} />} {/* Tax */}
                        {includePrice && <col style={{ width: '90px' }} />} {/* Price */}
                        {includeEmptyQty && <col style={{ width: '100px' }} />} {/* Order Qty */}
                        {includeRemarks && <col style={{ width: '95px' }} />} {/* Remarks */}
                    </colgroup>
                    <thead>
                        <tr style={{
                            backgroundColor: '#1e3a8a',
                            color: '#ffffff',
                            fontSize: '9px',
                            fontWeight: '700',
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase'
                        }}>
                            <th style={{
                                border: '1px solid #475569',
                                padding: '6px 4px',
                                textAlign: 'center'
                            }}>
                                Sr.
                            </th>
                            <th style={{
                                border: '1px solid #475569',
                                padding: '6px 8px',
                                textAlign: 'left'
                            }}>
                                Item Description / Product Name
                            </th>
                            {includeSku && (
                                <th style={{
                                    border: '1px solid #475569',
                                    padding: '6px 6px',
                                    textAlign: 'center'
                                }}>
                                    SKU / Code
                                </th>
                            )}
                            {includeTaxRate && (
                                <th style={{
                                    border: '1px solid #475569',
                                    padding: '6px 4px',
                                    textAlign: 'center'
                                }}>
                                    Tax %
                                </th>
                            )}
                            {includePrice && (
                                <th style={{
                                    border: '1px solid #475569',
                                    padding: '6px 8px',
                                    textAlign: 'right'
                                }}>
                                    Price (₹)
                                </th>
                            )}
                            {includeEmptyQty && (
                                <th style={{
                                    border: '1px solid #0284c7',
                                    backgroundColor: '#0284c7',
                                    color: '#ffffff',
                                    padding: '6px 4px',
                                    textAlign: 'center'
                                }}>
                                    Order Qty <span style={{ fontSize: '8px', opacity: 0.9 }}>[Fill]</span>
                                </th>
                            )}
                            {includeRemarks && (
                                <th style={{
                                    border: '1px solid #475569',
                                    padding: '6px 6px',
                                    textAlign: 'left'
                                }}>
                                    Remarks / Notes
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
                                        height: density === 'compact' ? '24px' : '28px'
                                    }}
                                >
                                    <td style={{
                                        border: '1px solid #cbd5e1',
                                        padding: `${rowPaddingY} 4px`,
                                        textAlign: 'center',
                                        color: '#64748b',
                                        fontFamily: 'monospace',
                                        fontSize: '9px'
                                    }}>
                                        {itemSr}
                                    </td>
                                    <td style={{
                                        border: '1px solid #cbd5e1',
                                        padding: `${rowPaddingY} 8px`,
                                        color: '#0f172a',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        <span style={{ fontWeight: '600' }}>{item.name}</span>
                                        {item.description && (
                                            <span style={{ fontSize: '8.5px', color: '#64748b', marginLeft: '6px' }}>
                                                ({item.description})
                                            </span>
                                        )}
                                    </td>
                                    {includeSku && (
                                        <td style={{
                                            border: '1px solid #cbd5e1',
                                            padding: `${rowPaddingY} 6px`,
                                            textAlign: 'center',
                                            color: '#475569',
                                            fontSize: '8.5px',
                                            fontFamily: 'monospace'
                                        }}>
                                            {item.sku || '-'}
                                        </td>
                                    )}
                                    {includeTaxRate && (
                                        <td style={{
                                            border: '1px solid #cbd5e1',
                                            padding: `${rowPaddingY} 4px`,
                                            textAlign: 'center',
                                            color: '#475569',
                                            fontSize: '9px'
                                        }}>
                                            {item.taxRate ? `${item.taxRate}%` : '0%'}
                                        </td>
                                    )}
                                    {includePrice && (
                                        <td style={{
                                            border: '1px solid #cbd5e1',
                                            padding: `${rowPaddingY} 8px`,
                                            textAlign: 'right',
                                            color: '#0f172a',
                                            fontWeight: '700'
                                        }}>
                                            ₹{parseFloat(item.price || 0).toFixed(2)}
                                        </td>
                                    )}
                                    {includeEmptyQty && (
                                        <td style={{
                                            border: '1px solid #cbd5e1',
                                            backgroundColor: '#f0f9ff',
                                            padding: '2px 6px',
                                            textAlign: 'center'
                                        }}>
                                            {/* Clean, perfectly-centered write-in box */}
                                            <div style={{
                                                height: boxHeight,
                                                border: '1.5px dashed #0284c7',
                                                borderRadius: '3px',
                                                backgroundColor: '#ffffff',
                                                width: '90%',
                                                margin: '0 auto'
                                            }} />
                                        </td>
                                    )}
                                    {includeRemarks && (
                                        <td style={{
                                            border: '1px solid #cbd5e1',
                                            padding: `${rowPaddingY} 6px`
                                        }}>
                                            <div style={{
                                                borderBottom: '1px dotted #94a3b8',
                                                height: '14px',
                                                width: '95%'
                                            }} />
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* 5. Terms, Conditions & Signatures (shown on last page) */}
                {page.isLastPage && page.showSignatures && (
                    <div style={{
                        borderTop: '1px solid #cbd5e1',
                        paddingTop: '8px',
                        marginTop: '12px'
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1.3fr 1fr',
                            gap: '12px',
                            marginBottom: '10px',
                            fontSize: '8.5px',
                            color: '#475569'
                        }}>
                            <div>
                                <div style={{
                                    fontWeight: 'bold',
                                    color: '#1e40af',
                                    marginBottom: '2px',
                                    textTransform: 'uppercase',
                                    fontSize: '8px'
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
                                    fontSize: '8px'
                                }}>
                                    Order via WhatsApp:
                                </div>
                                <div style={{ lineHeight: '1.35' }}>
                                    Send a clear photo of this filled sheet to <strong>{selectedStore.phone}</strong>. We will confirm and prepare your invoice immediately.
                                </div>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                            padding: '4px 10px 0 10px'
                        }}>
                            <div style={{ textAlign: 'center', width: '200px' }}>
                                <div style={{ height: '30px' }} />
                                <div style={{
                                    borderTop: '1px solid #0f172a',
                                    paddingTop: '2px',
                                    fontWeight: 'bold',
                                    fontSize: '9px',
                                    color: '#0f172a'
                                }}>
                                    Customer / Purchaser Signature
                                </div>
                                <div style={{ fontSize: '8px', color: '#64748b' }}>
                                    With Official Stamp & Date
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', width: '220px' }}>
                                <div style={{
                                    fontSize: '9px',
                                    fontWeight: 'bold',
                                    color: '#1e40af',
                                    marginBottom: '26px'
                                }}>
                                    For {selectedStore.name}
                                </div>
                                <div style={{
                                    borderTop: '1px solid #0f172a',
                                    paddingTop: '2px',
                                    fontWeight: 'bold',
                                    fontSize: '9px',
                                    color: '#0f172a'
                                }}>
                                    Authorized Signatory
                                </div>
                                <div style={{ fontSize: '8px', color: '#64748b' }}>
                                    Sales / Proprietor
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. Page Footer */}
                <div style={{
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '4px',
                    marginTop: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '8px',
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
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-hidden">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in duration-200">
                {/* Modal Header */}
                <div className="px-6 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Price List & Order Sheet Generator
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                                    {processedItems.length} Items • {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
                                </span>
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Exact print preview & aligned A4 PDF with customer fill-in quantity boxes.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
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

                {/* Modal Body: Left controls + Right live preview */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Customization Settings */}
                    <div className={`w-full sm:w-80 md:w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto p-4 space-y-4 text-xs ${activeTab === 'preview' ? 'hidden sm:block' : 'block'}`}>
                        {/* Store Selection */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                                <Store className="h-4 w-4 text-blue-600" />
                                Store Profile
                            </label>
                            <select
                                value={selectedStoreKey}
                                onChange={(e) => setSelectedStoreKey(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="store1">Shri Brahmchaitanya Enterprises</option>
                                <option value="store2">चैतन्य साहित्य भांडार</option>
                                <option value="store3">गुरुकृपा एंटरप्राइजेस</option>
                            </select>
                        </div>

                        {/* Page Layout Density */}
                        <div className="space-y-1.5 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/50">
                            <label className="flex items-center justify-between font-bold text-gray-800 dark:text-gray-200">
                                <span className="flex items-center gap-1.5">
                                    <Maximize2 className="h-3.5 w-3.5 text-blue-600" />
                                    Page Layout Density
                                </span>
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                                    {density}
                                </span>
                            </label>
                            <div className="grid grid-cols-3 gap-1.5 mt-1">
                                <button
                                    type="button"
                                    onClick={() => setDensity('compact')}
                                    className={`py-1.5 px-2 rounded text-center font-medium transition-colors border ${density === 'compact' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}
                                >
                                    Compact
                                    <span className="block text-[9px] opacity-80">~30 items/pg</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDensity('standard')}
                                    className={`py-1.5 px-2 rounded text-center font-medium transition-colors border ${density === 'standard' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}
                                >
                                    Standard
                                    <span className="block text-[9px] opacity-80">~24 items/pg</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDensity('comfortable')}
                                    className={`py-1.5 px-2 rounded text-center font-medium transition-colors border ${density === 'comfortable' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}
                                >
                                    Spacious
                                    <span className="block text-[9px] opacity-80">~18 items/pg</span>
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                Tip: Use <strong>Compact</strong> to fit more items and avoid unnecessary blank space.
                            </p>
                        </div>

                        {/* Document Title */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                                <Settings2 className="h-4 w-4 text-blue-600" />
                                Document Heading
                            </label>
                            <input
                                type="text"
                                value={documentTitle}
                                onChange={(e) => setDocumentTitle(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Filter & Sorting */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                                <Filter className="h-4 w-4 text-blue-600" />
                                Items Filter & Sorting
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[10px] text-gray-500 block mb-1">Status</span>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="active">Active Items Only</option>
                                        <option value="inStock">In Stock Only</option>
                                        <option value="all">All Items</option>
                                    </select>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-500 block mb-1">Sort</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="name-asc">Name (A → Z)</option>
                                        <option value="price-asc">Price (Low → High)</option>
                                        <option value="price-desc">Price (High → Low)</option>
                                        <option value="sku">SKU Code</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Column Checkboxes */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                                Columns to Include
                            </label>
                            <div className="space-y-1.5 bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600">
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-emerald-700 dark:text-emerald-400">
                                    <input
                                        type="checkbox"
                                        checked={includeEmptyQty}
                                        onChange={(e) => setIncludeEmptyQty(e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>Empty "Order Qty" Box (For customer fill-in)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includePrice}
                                        onChange={(e) => setIncludePrice(e.target.checked)}
                                        className="rounded text-blue-600"
                                    />
                                    <span>Price Column (₹)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeSku}
                                        onChange={(e) => setIncludeSku(e.target.checked)}
                                        className="rounded text-blue-600"
                                    />
                                    <span>SKU / Product Code</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeRemarks}
                                        onChange={(e) => setIncludeRemarks(e.target.checked)}
                                        className="rounded text-blue-600"
                                    />
                                    <span>Customer Remarks / Notes Line</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeTaxRate}
                                        onChange={(e) => setIncludeTaxRate(e.target.checked)}
                                        className="rounded text-blue-600"
                                    />
                                    <span>Tax Rate (%)</span>
                                </label>
                            </div>
                        </div>

                        {/* Customer Header Form */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
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
                                <div className="space-y-1.5 bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <select
                                        value={selectedCustomerId}
                                        onChange={(e) => handleCustomerChange(e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">-- Blank Lines (For Any Customer) --</option>
                                        {(customers || []).map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Customer / School Name"
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="Mobile / Contact No."
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Terms & Signatures Toggle */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                                Signatures & Terms Box
                            </span>
                            <input
                                type="checkbox"
                                checked={includeSignatures}
                                onChange={(e) => setIncludeSignatures(e.target.checked)}
                                className="rounded text-blue-600"
                            />
                        </div>
                    </div>

                    {/* Right: Live Interactive Document Preview */}
                    <div className={`flex-1 bg-gray-100 dark:bg-gray-900 flex flex-col overflow-hidden ${activeTab === 'customization' ? 'hidden sm:flex' : 'flex'}`}>
                        {/* Topbar: Zoom & Info */}
                        <div className="px-6 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 font-medium">
                                <Eye className="h-4 w-4 text-emerald-600" />
                                Exact Document Preview ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})
                            </div>

                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                                <button
                                    onClick={() => setZoomLevel(prev => Math.max(0.4, prev - 0.1))}
                                    className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="h-3.5 w-3.5" />
                                </button>
                                <span className="text-[11px] font-mono px-2 text-gray-700 dark:text-gray-200">
                                    {Math.round(zoomLevel * 100)}%
                                </span>
                                <button
                                    onClick={() => setZoomLevel(prev => Math.min(1.2, prev + 0.1))}
                                    className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
                                    title="Zoom In"
                                >
                                    <ZoomIn className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Visible Scrollable Preview Pane */}
                        <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center">
                            <div
                                className="origin-top transition-transform"
                                style={{ transform: `scale(${zoomLevel})` }}
                            >
                                {pages.map((page, pageIdx) => renderPageContent(page, pageIdx, true))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hidden Unscaled 1:1 Export Container (Ensures 100% pixel-perfect PDF & Print) */}
                <div
                    ref={exportContainerRef}
                    style={{
                        position: 'fixed',
                        left: '-9999px',
                        top: 0,
                        width: '794px',
                        backgroundColor: '#ffffff',
                        zIndex: -1,
                        pointerEvents: 'none'
                    }}
                >
                    {pages.map((page, pageIdx) => renderPageContent(page, pageIdx, false))}
                </div>

                {/* Modal Footer Action Buttons */}
                <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {isGenerating ? (
                            <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent rounded-full" />
                                Generating Page {generationProgress.current} of {generationProgress.total}...
                            </span>
                        ) : (
                            <span>
                                Total <strong>{processedItems.length} products</strong> across <strong>{pages.length} A4 {pages.length === 1 ? 'page' : 'pages'}</strong>.
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
                            title="Direct print isolated price list to physical printer or browser PDF"
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
