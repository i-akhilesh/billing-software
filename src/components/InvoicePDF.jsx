import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Create styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333333'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        paddingBottom: 20
    },
    companyDetails: {
        width: '60%'
    },
    companyName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1d4ed8', // blue-700
        textTransform: 'uppercase',
        marginBottom: 5
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
        marginTop: 20,
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#F9FAFB',
        borderRadius: 4
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1d4ed8',
        marginBottom: 8,
        textTransform: 'uppercase'
    },
    customerName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4
    },
    table: {
        width: '100%',
        marginTop: 20,
        marginBottom: 20
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
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        padding: 8,
        fontSize: 9
    },
    colDesc: { width: '40%' },
    colQty: { width: '10%', textAlign: 'center' },
    colPrice: { width: '15%', textAlign: 'right' },
    colTax: { width: '15%', textAlign: 'right' },
    colTotal: { width: '20%', textAlign: 'right' },

    totalsSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10
    },
    totalsBox: {
        width: '40%',
        padding: 10,
        backgroundColor: '#F9FAFB',
        borderRadius: 4
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
    grandTotalText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1d4ed8'
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
    terms: {
        marginTop: 40,
        fontSize: 8,
        color: '#666666',
        fontStyle: 'italic'
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
                        <Text style={styles.companyName}>Shri Bramachaitanya Enterprises</Text>
                        <Text style={styles.companyAddress}>
                            123, Business Park, Industrial Area{"\n"}
                            Pune, Maharashtra, 411001{"\n"}
                            GSTIN: 27ABCDE1234F1Z5{"\n"}
                            Phone: +91 98765 43210
                        </Text>
                    </View>
                    <View style={styles.invoiceDetails}>
                        <Text style={styles.title}>INVOICE</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Invoice #:</Text>
                            <Text style={styles.detailValue}>{invoice.invoiceNumber}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Date:</Text>
                            <Text style={styles.detailValue}>{format(new Date(invoice.date), 'dd MMM yyyy')}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Due Date:</Text>
                            <Text style={styles.detailValue}>{format(new Date(invoice.dueDate), 'dd MMM yyyy')}</Text>
                        </View>
                    </View>
                </View>

                {/* Bill To */}
                <View style={styles.billTo}>
                    <Text style={styles.sectionTitle}>Bill To:</Text>
                    <Text style={styles.customerName}>{customer?.name || 'Walk-in Customer'}</Text>
                    <Text style={{ marginTop: 2 }}>{customer?.email}</Text>
                    <Text style={{ marginTop: 2 }}>{customer?.phone}</Text>
                    <Text style={{ marginTop: 2 }}>{customer?.address}</Text>
                    {customer?.gstin && <Text style={{ marginTop: 2, fontWeight: 'bold' }}>GSTIN: {customer.gstin}</Text>}
                </View>

                {/* Items Table Header */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colDesc}>Item Description</Text>
                        <Text style={styles.colQty}>Qty</Text>
                        <Text style={styles.colPrice}>Price</Text>
                        <Text style={styles.colTax}>Tax</Text>
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
                                    <Text style={{ fontWeight: 'bold' }}>{itemDetails.name || 'Item'}</Text>
                                    {item.description ? <Text style={{ color: '#666', fontSize: 8, marginTop: 2 }}>{item.description}</Text> : null}
                                </View>
                                <Text style={styles.colQty}>{qty}</Text>
                                <Text style={styles.colPrice}>₹{price.toFixed(2)}</Text>
                                <Text style={styles.colTax}>{taxRate}%</Text>
                                <Text style={styles.colTotal}>₹{amount.toFixed(2)}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text>Subtotal:</Text>
                            <Text>₹{invoice.subtotal?.toFixed(2) || '0.00'}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text>Tax Total:</Text>
                            <Text>₹{invoice.taxTotal?.toFixed(2) || '0.00'}</Text>
                        </View>
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
                    </View>
                </View>

                {/* Terms & Footer */}
                <View style={styles.terms}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Terms & Conditions:</Text>
                    <Text>1. Goods once sold will not be taken back.</Text>
                    <Text>2. Interest @ 18% p.a. will be charged on overdue payments.</Text>
                    <Text>3. Subject to local jurisdiction.</Text>
                </View>

                <View style={styles.footer}>
                    <Text>Thank you for your business!</Text>
                    <Text style={{ marginTop: 4 }}>Generated by BramhaChaitanya Billing System</Text>
                </View>
            </Page>
        </Document>
    );
};

export default InvoicePDF;
