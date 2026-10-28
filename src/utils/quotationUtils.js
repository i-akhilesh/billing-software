/**
 * Utilities for Quotation and Invoice number mapping and formatting
 */

/**
 * Derives a quotation number from an invoice number.
 * Example:
 * - 'INV-008' -> 'QT-008'
 * - 'INV-8'   -> 'QT-008'
 * - 'INV-012' -> 'QT-012'
 * - 'INV-2024-008' -> 'QT-008'
 * - '#INV-008' -> 'QT-008'
 * - '8'       -> 'QT-008'
 *
 * @param {string} invoiceNumber
 * @returns {string} Quotation number formatted as 'QT-XXX'
 */
export const getQuotationNumberFromInvoice = (invoiceNumber) => {
    if (!invoiceNumber) return 'QT-001';

    const str = String(invoiceNumber).trim();

    // Extract all numeric sequences
    const matches = str.match(/\d+/g);
    if (matches && matches.length > 0) {
        // Take the trailing sequential number (e.g. 008 in INV-2024-008 or 008 in INV-008)
        const lastDigits = matches[matches.length - 1];
        return `QT-${lastDigits.padStart(3, '0')}`;
    }

    // Fallback if no digits found but starts with INV
    if (/^#?INV[-_]?/i.test(str)) {
        return str.replace(/^#?INV[-_]?/i, 'QT-');
    }

    return `QT-${str}`;
};

/**
 * Extracts invoice number from quotation notes (e.g., 'Converted from Invoice INV-008')
 * 
 * @param {string} notes
 * @returns {string|null}
 */
export const extractInvoiceNumberFromNotes = (notes) => {
    if (!notes) return null;
    const match = String(notes).match(/Invoice\s+(#?INV[-_\w\d]+|\d+)/i);
    return match ? match[1] : null;
};

/**
 * Formats a quotation number with standard 3-digit padding (e.g., 'QT-008').
 * If the quotation was converted from an invoice, ensures the serial number
 * matches the invoice number.
 *
 * @param {string} num - Quotation number or raw string
 * @param {string} fallbackId - Fallback ID if num is empty
 * @param {object} quotationObj - Full quotation object if available
 * @returns {string} Standardized quotation number (e.g., 'QT-008')
 */
export const formatQuoteNumber = (num, fallbackId, quotationObj) => {
    // 1. If explicit invoiceNumber is saved on the quotation
    if (quotationObj?.invoiceNumber) {
        return getQuotationNumberFromInvoice(quotationObj.invoiceNumber);
    }

    // 2. If notes mention the source invoice (e.g., 'Converted from Invoice INV-008')
    if (quotationObj?.notes) {
        const invNum = extractInvoiceNumberFromNotes(quotationObj.notes);
        if (invNum) {
            return getQuotationNumberFromInvoice(invNum);
        }
    }

    // 3. Fallback to num or fallbackId
    const src = num || fallbackId || '';
    const str = String(src).trim();

    // If source itself contains INV reference
    if (/INV[-_]?\d+/i.test(str)) {
        return getQuotationNumberFromInvoice(str);
    }

    const matches = str.match(/\d+/g);
    if (matches && matches.length > 0) {
        const lastDigits = matches[matches.length - 1];
        return `QT-${lastDigits.padStart(3, '0')}`;
    }

    return str ? `QT-${str}` : 'QT-001';
};
