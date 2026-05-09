import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Register a custom font that supports Devanagari (Marathi)
Font.register({
    family: 'NotoSansDevanagari',
    src: '/NotoSansDevanagari-Regular.ttf'
});

// A helper to convert legacy Shivaji/KrutiDev ASCII input to Unicode Devanagari
// This allows the user's legacy inputs to render correctly with the NotoSans font.
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

// Create styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 20,
        fontFamily: 'NotoSansDevanagari',
        fontSize: 10,
        color: '#333333'
    },
    bottomSection: {
        flexDirection: 'row',
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 10,
    },
    bankDetails: {
        width: '60%',
        paddingRight: 20,
    },
    totalsBox: {
        width: '40%',
    },
    footerSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 40,
    },
    terms: {
        width: '60%',
    },
    signatureBox: {
        width: '40%',
        textAlign: 'right',
    },
    signatureLine: {
        marginTop: 40,
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingTop: 4,
        fontWeight: 'bold',
        fontSize: 10,
    },
    signatureCompany: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        paddingBottom: 10
    },
    companyDetails: {
        width: '60%'
    },
    companyName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1d4ed8', // blue-700
        textTransform: 'uppercase',
        marginBottom: 2
    },
    companyAddress: {
        fontSize: 9,
        color: '#666666',
        lineHeight: 1.4
    },
    invoiceDetails: {
        width: '40%',
        alignItems: 'flex-end'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 2
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 4
    },
    detailLabel: {
        width: 80,
        fontWeight: 'bold',
        color: '#666666',
        textAlign: 'right',
        marginRight: 10
    },
    detailValue: {
        textAlign: 'right'
    },
    billTo: {
        marginTop: 5,
        marginBottom: 5,
        padding: 8,
        backgroundColor: '#F9FAFB',
        borderRadius: 4
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1d4ed8',
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    customerName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4
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
        padding: 4,
        fontSize: 9
    },
    colDesc: { width: '50%' },
    colQty: { width: '10%', textAlign: 'center' },
    colPrice: { width: '20%', textAlign: 'right' },
    colTotal: { width: '20%', textAlign: 'right' },

    grandTotalText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1d4ed8'
    },
    amountInWords: {
        fontSize: 9,
        color: '#1d4ed8',
        fontWeight: 'bold',
        textAlign: 'right',
        marginTop: 5,
        fontStyle: 'italic'
    },
    bottomSection: {
        flexDirection: 'row',
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 5,
    },
    bankDetails: {
        width: '55%',
        paddingRight: 20,
    },
    totalsBox: {
        width: '45%',
        padding: 10,
        backgroundColor: '#F9FAFB',
        borderRadius: 4
    },
    footerSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 20,
        paddingBottom: 10,
    },
    terms: {
        width: '55%',
    },
    signatureBox: {
        width: '45%',
        textAlign: 'right',
    },
    signatureLine: {
        marginTop: 50,
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingTop: 4,
        fontWeight: 'bold',
        fontSize: 10,
    },
    signatureCompany: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    grandTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#DDDDDD',
        paddingTop: 8,
        marginTop: 4
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        color: '#999999',
        fontSize: 8,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingTop: 10
    },
    bankTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1d4ed8',
        marginBottom: 4,
    },
    bankText: {
        fontSize: 9,
        color: '#666',
        lineHeight: 1.4
    },
    compositionNote: {
        fontSize: 9,
        color: '#d97706',
        marginTop: 4,
        fontStyle: 'italic',
        maxWidth: 200,
    },
    amountInWords: {
        marginTop: 10,
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1d4ed8'
    },
    bottomSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    bottomLeft: {
        width: '50%',
    }
});

const InvoicePDF = ({ invoice, customer, items }) => {
    // Helper to get item details
    const getItemDetails = (itemId) => {
        return items?.find(i => i.id === itemId) || {};
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.companyDetails}>
                        <Text style={styles.companyName}>Shri Brahmchaitanya Enterprises</Text>
                        <Text style={styles.companyAddress}>
                            N-11, B 19/4, Subhashchandra Bose Nagar,{"\n"}
                            Hudco, Chh. Sambhaji Nagar, 431003{"\n"}
                            GSTIN: 27AWRPP6364M1ZI{"\n"}
                            Unique Code: VAMHAU00097869{"\n"}
                            Phone: +91 81809 19544
                        </Text>
                    </View>
                    <View style={styles.invoiceDetails}>
                        <Text style={styles.title}>INVOICE</Text>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 2, textAlign: 'right' }}>
                            Composition Scheme
                        </Text>
                        <Text style={{ fontSize: 8, color: '#d97706', marginBottom: 10, textAlign: 'right', fontStyle: 'italic', maxWidth: 150 }}>
                            Composition dealer is not eligible to collect tax on supply
                        </Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Invoice #:</Text>
                            <Text style={styles.detailValue}>{invoice.invoiceNumber}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Date:</Text>
                            <Text style={styles.detailValue}>{format(new Date(invoice.date), 'dd MMM yyyy')}</Text>
                        </View>
                    </View>
                </View>

                {/* Bill To */}
                <View style={styles.billTo}>
                    <Text style={styles.sectionTitle}>Bill To:</Text>
                    <Text style={styles.customerName}>{convertLegacyMarathi(customer?.name) || 'Walk-in Customer'}</Text>
                    <Text style={{ marginTop: 2 }}>{convertLegacyMarathi(customer?.phone)}</Text>
                    <Text style={{ marginTop: 2 }}>{convertLegacyMarathi(customer?.address)}</Text>
                    {customer?.gstin && <Text style={{ marginTop: 2, fontWeight: 'bold' }}>GSTIN: {customer.gstin}</Text>}
                </View>

                {/* Items Table Header */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colDesc}>Item Description</Text>
                        <Text style={styles.colQty}>Qty</Text>
                        <Text style={styles.colPrice}>Price</Text>
                        <Text style={styles.colTotal}>Amount</Text>
                    </View>

                    {/* Items Rows */}
                    {invoice.items.map((item, index) => {
                        const itemDetails = getItemDetails(item.itemId);
                        const price = parseFloat(item.price) || 0;
                        const qty = parseFloat(item.quantity) || 0;
                        const taxRate = parseFloat(item.taxRate) || 0;
                        const amount = price * qty;

                        return (
                            <View style={styles.tableRow} key={index}>
                                <View style={styles.colDesc}>
                                    <Text style={{ fontWeight: 'bold' }}>{convertLegacyMarathi(itemDetails.name) || 'Item'}</Text>
                                </View>
                                <Text style={styles.colQty}>{qty}</Text>
                                <Text style={styles.colPrice}>₹{price.toFixed(2)}</Text>
                                <Text style={styles.colTotal}>₹{amount.toFixed(2)}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Row 1: Bank Details and Totals */}
                <View style={styles.bottomSection}>
                    <View style={styles.bankDetails}>
                        <Text style={styles.bankTitle}>Bank Details:</Text>
                        <Text style={styles.bankText}>Bank Name: Bank of Maharashtra</Text>
                        <Text style={styles.bankText}>Account No.: 60410431900</Text>
                        <Text style={styles.bankText}>Branch: Hudco, TV Centre</Text>
                        <Text style={styles.bankText}>IFSC Code: MAHB0001191</Text>
                    </View>

                    <View style={styles.totalsBox}>
                        {/* Subtotal removed */}
                        {invoice.discount > 0 && (
                            <View style={styles.totalRow}>
                                <Text>Discount:</Text>
                                <Text>- ₹{invoice.discount?.toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={styles.grandTotal}>
                            <Text style={styles.grandTotalText}>Total:</Text>
                            <Text style={styles.grandTotalText}>₹{invoice.total?.toFixed(2) || '0.00'}</Text>
                        </View>
                        <Text style={styles.amountInWords}>
                            Rupees {numberToWords(invoice.total || 0)}
                        </Text>
                    </View>
                </View>

                {/* Row 2: Terms and Signature */}
                <View style={styles.footerSection}>
                    <View style={styles.terms}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Terms & Conditions:</Text>
                        <Text>1. Interest will be recovered @24% p.a. on overdue unpaid bills.</Text>
                        <Text>2. Goods once sold cannot be Returned or Exchanged.</Text>
                        <Text>3. Subject to Chh. Sambhaji Nagar Jurisdiction</Text>
                        <Text>4. E&OE</Text>
                    </View>

                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureCompany}>Shri Brahmchaitanya Enterprises</Text>
                        <Text style={styles.signatureLine}>Authorised Signature</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text>Thank you for your business!</Text>
                    <Text style={{ marginTop: 4 }}>Generated by Brahmchaitanya Billing System</Text>
                </View>
            </Page>
        </Document>
    );
};

export default InvoicePDF;
