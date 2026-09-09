import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Register custom font supporting Devanagari (Marathi)
Font.register({
    family: 'NotoSansDevanagari',
    src: '/NotoSansDevanagari-Regular.ttf'
});

const convertLegacyMarathi = (text) => {
    if (!text || typeof text !== 'string') return text;
    return text
        .replace(/\? \* \*M0> 6> 6G&M0> \.\(0/g, 'जि प प्रा शा शेंद्रा कमनगर')
        .replace(/5\?&M\/>0M%@ 9G0@/g, 'विद्यार्थी हजेरी')
        .replace(/5\?&M\/>0M%@/g, 'विद्यार्थी');
};

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

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 24,
        fontFamily: 'NotoSansDevanagari',
        fontSize: 10,
        color: '#333333'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        paddingBottom: 12
    },
    companyDetails: {
        width: '60%'
    },
    companyName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1d4ed8',
        textTransform: 'uppercase',
        marginBottom: 3
    },
    companyAddress: {
        fontSize: 9,
        color: '#555555',
        lineHeight: 1.4
    },
    quoteDetails: {
        width: '40%',
        alignItems: 'flex-end'
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 2
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 3
    },
    detailLabel: {
        width: 85,
        fontWeight: 'bold',
        color: '#64748b',
        textAlign: 'right',
        marginRight: 6
    },
    detailValue: {
        textAlign: 'right'
    },
    billTo: {
        marginTop: 5,
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1d4ed8',
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    customerName: {
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 3
    },
    table: {
        width: '100%',
        marginTop: 10,
        marginBottom: 10
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1d4ed8',
        color: '#FFFFFF',
        padding: 8,
        fontSize: 9,
        fontWeight: 'bold'
    },
    tableRow: {
        flexDirection: 'row',
        padding: 5,
        fontSize: 9,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    colDesc: { width: '50%' },
    colQty: { width: '10%', textAlign: 'center' },
    colPrice: { width: '20%', textAlign: 'right' },
    colTotal: { width: '20%', textAlign: 'right' },
    bottomSection: {
        flexDirection: 'row',
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingTop: 10
    },
    bankDetails: {
        width: '55%',
        paddingRight: 20
    },
    totalsBox: {
        width: '45%',
        padding: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6
    },
    grandTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#CBD5E1',
        paddingTop: 8,
        marginTop: 4
    },
    grandTotalText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1d4ed8'
    },
    amountInWords: {
        marginTop: 8,
        fontSize: 9,
        fontWeight: 'bold',
        color: '#1d4ed8',
        fontStyle: 'italic'
    },
    footerSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 24,
        paddingBottom: 10
    },
    terms: {
        width: '55%'
    },
    signatureBox: {
        width: '45%',
        textAlign: 'right'
    },
    signatureLine: {
        marginTop: 45,
        borderTopWidth: 1,
        borderTopColor: '#000000',
        paddingTop: 4,
        fontWeight: 'bold',
        fontSize: 10
    },
    signatureCompany: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4
    },
    footer: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 8
    }
});

const formatQuoteNumber = (num, fallbackId) => {
    const src = num || fallbackId || '';
    const match = String(src).match(/\d+/);
    if (match) {
        return `QT-${match[0].padStart(3, '0')}`;
    }
    return src ? `QT-${src}` : 'QT-001';
};

const QuotationPDF = ({ quotation, customer, storeInfo, markupPercent = 0 }) => {
    const markupFactor = 1 + (parseFloat(markupPercent) || 0) / 100;

    let subtotal = 0;
    const itemRows = (quotation?.items || []).map(item => {
        const basePrice = parseFloat(item.price) || 0;
        const adjustedPrice = Math.round(basePrice * markupFactor);
        const qty = parseFloat(item.quantity) || 0;
        const lineTotal = adjustedPrice * qty;
        subtotal += lineTotal;
        return {
            name: item.name || 'Item',
            qty,
            adjustedPrice,
            lineTotal
        };
    });

    const discount = parseFloat(quotation?.discount) || 0;
    const grandTotal = Math.max(0, subtotal - discount);
    const formattedQuoteNo = formatQuoteNumber(quotation?.quotationNumber, quotation?.id);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.companyDetails}>
                        <Text style={styles.companyName}>{storeInfo.name}</Text>
                        <Text style={styles.companyAddress}>
                            {storeInfo.address}
                        </Text>
                    </View>
                    <View style={styles.quoteDetails}>
                        <Text style={styles.title}>QUOTATION</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Serial number:</Text>
                            <Text style={styles.detailValue}># {formattedQuoteNo}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Date:</Text>
                            <Text style={styles.detailValue}>
                                {quotation.date ? format(new Date(quotation.date), 'dd MMM yyyy') : '-'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Bill To */}
                <View style={styles.billTo}>
                    <Text style={styles.sectionTitle}>Quotation For:</Text>
                    <Text style={styles.customerName}>
                        {convertLegacyMarathi(customer?.name || quotation.customerName) || 'Valued Customer'}
                    </Text>
                    {customer?.phone && <Text style={{ marginTop: 1 }}>Phone: {convertLegacyMarathi(customer.phone)}</Text>}
                    {customer?.address && <Text style={{ marginTop: 1 }}>Address: {convertLegacyMarathi(customer.address)}</Text>}
                    {customer?.gstin && <Text style={{ marginTop: 1, fontWeight: 'bold' }}>GSTIN: {customer.gstin}</Text>}
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colDesc}>Item Description</Text>
                        <Text style={styles.colQty}>Qty</Text>
                        <Text style={styles.colPrice}>Rate (₹)</Text>
                        <Text style={styles.colTotal}>Amount (₹)</Text>
                    </View>

                    {itemRows.map((item, index) => (
                        <View style={styles.tableRow} key={index}>
                            <View style={styles.colDesc}>
                                <Text style={{ fontWeight: 'bold' }}>{convertLegacyMarathi(item.name)}</Text>
                            </View>
                            <Text style={styles.colQty}>{item.qty}</Text>
                            <Text style={styles.colPrice}>₹{item.adjustedPrice.toFixed(2)}</Text>
                            <Text style={styles.colTotal}>₹{item.lineTotal.toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* Bottom Section */}
                <View style={styles.bottomSection}>
                    <View style={styles.bankDetails}>
                        <Text style={{ fontSize: 9, color: '#1d4ed8', fontWeight: 'bold', lineHeight: 1.4 }}>
                            Special Note: This official quotation is valid for government / private tenders.
                        </Text>
                    </View>

                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text>Subtotal:</Text>
                            <Text>₹{subtotal.toFixed(2)}</Text>
                        </View>
                        {discount > 0 && (
                            <View style={styles.totalRow}>
                                <Text>Discount:</Text>
                                <Text>- ₹{discount.toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={styles.grandTotal}>
                            <Text style={styles.grandTotalText}>Total Quote:</Text>
                            <Text style={styles.grandTotalText}>₹{grandTotal.toFixed(2)}</Text>
                        </View>
                        <Text style={styles.amountInWords}>
                            Rupees {numberToWords(grandTotal)}
                        </Text>
                    </View>
                </View>

                {/* Footer Section */}
                <View style={styles.footerSection}>
                    <View style={styles.terms}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>Terms & Conditions:</Text>
                        <Text>1. Goods once sold will be subject to warranty terms.</Text>
                        <Text>2. Subject to local jurisdiction.</Text>
                        <Text>3. E&OE</Text>
                    </View>

                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureCompany}>{storeInfo.name}</Text>
                        <Text style={styles.signatureLine}>Signature</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text>Thank you for giving us the opportunity to quote!</Text>
                </View>
            </Page>
        </Document>
    );
};

export default QuotationPDF;
