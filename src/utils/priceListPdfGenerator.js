import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Splits a list of items across pages calibrated for A4 layout.
 * Ensures rows, customer blocks, and signature sections never overflow or cut awkwardly.
 */
export const paginateCatalogItems = (items = [], options = {}) => {
    const {
        includeCustomerBox = true,
        includeInstructions = true,
        includeSignatures = true
    } = options;

    const total = items.length;

    // Single page threshold (Header + Customer Box + Instructions + Table + Signatures + Footer)
    const singlePageLimit = includeCustomerBox ? 14 : 18;

    if (total <= singlePageLimit) {
        return [{
            pageIndex: 0,
            pageNumber: 1,
            totalPages: 1,
            isFirstPage: true,
            isLastPage: true,
            items: items,
            showCustomerBox: includeCustomerBox,
            showInstructions: includeInstructions,
            showSignatures: includeSignatures
        }];
    }

    // Multi-page layout
    const pages = [];
    let currentIndex = 0;

    // Page 1 capacity (without signatures, but with Header & Customer info)
    const page1Limit = includeCustomerBox ? 16 : 22;
    const page1Items = items.slice(0, page1Limit);
    currentIndex += page1Items.length;

    pages.push({
        pageIndex: 0,
        pageNumber: 1,
        isFirstPage: true,
        isLastPage: false,
        items: page1Items,
        showCustomerBox: includeCustomerBox,
        showInstructions: includeInstructions,
        showSignatures: false
    });

    // Middle pages capacity vs Last page (with signatures) capacity
    const middlePageLimit = 24;
    const lastPageLimit = 18; // space reserved for Terms & Signatures

    let remaining = items.slice(currentIndex);
    let pageNum = 2;

    while (remaining.length > 0) {
        if (remaining.length <= lastPageLimit) {
            // Fits cleanly on the final page with signatures
            pages.push({
                pageIndex: pages.length,
                pageNumber: pageNum,
                isFirstPage: false,
                isLastPage: true,
                items: remaining,
                showCustomerBox: false,
                showInstructions: false,
                showSignatures: includeSignatures
            });
            break;
        } else if (remaining.length <= middlePageLimit) {
            // Between 19 and 24 items:
            // Squeezing 24 items + signatures on one page would be tight.
            // Split into two balanced pages so signatures have plenty of room.
            const half = Math.ceil(remaining.length / 2);
            pages.push({
                pageIndex: pages.length,
                pageNumber: pageNum++,
                isFirstPage: false,
                isLastPage: false,
                items: remaining.slice(0, half),
                showCustomerBox: false,
                showInstructions: false,
                showSignatures: false
            });
            pages.push({
                pageIndex: pages.length,
                pageNumber: pageNum,
                isFirstPage: false,
                isLastPage: true,
                items: remaining.slice(half),
                showCustomerBox: false,
                showInstructions: false,
                showSignatures: includeSignatures
            });
            break;
        } else {
            // More than a full middle page
            pages.push({
                pageIndex: pages.length,
                pageNumber: pageNum++,
                isFirstPage: false,
                isLastPage: false,
                items: remaining.slice(0, middlePageLimit),
                showCustomerBox: false,
                showInstructions: false,
                showSignatures: false
            });
            remaining = remaining.slice(middlePageLimit);
        }
    }

    const totalPages = pages.length;
    return pages.map(p => ({ ...p, totalPages }));
};

/**
 * Generates and downloads a multi-page PDF from a container element holding page DOM nodes.
 * @param {HTMLElement} containerRef - Container containing .catalog-pdf-page elements
 * @param {string} filename - Output PDF filename
 * @param {Function} [onProgress] - Optional progress callback (current, total)
 */
export const generatePriceListPDF = async (containerRef, filename = 'Product_Price_List_Order_Sheet.pdf', onProgress) => {
    if (!containerRef) {
        throw new Error('PDF container element not found');
    }

    // Wait for fonts to be loaded
    if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
    }

    const pageElements = containerRef.querySelectorAll('.catalog-pdf-page');
    if (!pageElements || pageElements.length === 0) {
        throw new Error('No printable pages found to generate');
    }

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();   // 210 mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm
    const totalPages = pageElements.length;

    for (let i = 0; i < totalPages; i++) {
        if (onProgress) {
            onProgress(i + 1, totalPages);
        }

        if (i > 0) {
            pdf.addPage();
        }

        const pageEl = pageElements[i];

        const canvas = await html2canvas(pageEl, {
            scale: 2, // High resolution for crisp print quality
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                // Ensure all color variables are explicitly assigned to prevent oklch parsing crashes
                const style = clonedDoc.createElement('style');
                style.innerHTML = `
                    :root, * {
                        --color-gray-950: #030712 !important;
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
                        --color-emerald-700: #047857 !important;
                        --color-emerald-600: #059669 !important;
                        --color-emerald-500: #10b981 !important;
                        --color-white: #ffffff !important;
                    }
                    .catalog-pdf-page {
                        box-shadow: none !important;
                        margin: 0 !important;
                    }
                `;
                clonedDoc.head.appendChild(style);
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    pdf.save(filename);
    return true;
};

