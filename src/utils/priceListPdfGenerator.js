import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Smart density-aware pagination for A4 price list / catalog.
 * Dynamically packs items to prevent awkward blank space and unnecessary extra pages.
 */
export const paginateCatalogItems = (items = [], options = {}) => {
    const {
        includeCustomerBox = true,
        includeInstructions = true,
        includeSignatures = true,
        density = 'standard' // 'compact' | 'standard' | 'comfortable'
    } = options;

    const total = items.length;

    // Capacity limits based on density
    let singlePageLimit = 24;
    let page1Limit = 26;
    let middlePageLimit = 34;
    let lastPageLimit = 24;

    if (density === 'compact') {
        singlePageLimit = includeCustomerBox ? 30 : 34;
        page1Limit = includeCustomerBox ? 32 : 36;
        middlePageLimit = 38;
        lastPageLimit = 28;
    } else if (density === 'comfortable') {
        singlePageLimit = includeCustomerBox ? 16 : 20;
        page1Limit = includeCustomerBox ? 18 : 22;
        middlePageLimit = 26;
        lastPageLimit = 18;
    } else {
        // standard
        singlePageLimit = includeCustomerBox ? 22 : 26;
        page1Limit = includeCustomerBox ? 25 : 28;
        middlePageLimit = 32;
        lastPageLimit = 22;
    }

    // 1. Fits completely on a single page
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

    // 2. Multi-page layout
    const pages = [];
    let currentIndex = 0;

    // Page 1
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

    let remaining = items.slice(currentIndex);
    let pageNum = 2;

    while (remaining.length > 0) {
        if (remaining.length <= lastPageLimit) {
            // Fits cleanly on the last page with signatures
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
            // If it's slightly more than lastPageLimit but less than middlePageLimit,
            // check if remaining items can be split into two well-balanced pages
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
 * Generates and downloads a multi-page PDF from a container holding .catalog-pdf-page elements.
 * Renders at 2x scale for razor-sharp 300 DPI print quality without any alignment distortions.
 */
export const generatePriceListPDF = async (containerEl, filename = 'Price_List_Order_Sheet.pdf', onProgress) => {
    if (!containerEl) {
        throw new Error('PDF source container not found');
    }

    if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
    }

    const pageElements = containerEl.querySelectorAll('.catalog-pdf-page');
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
            scale: 2, // High resolution (300 DPI equivalent)
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 794,
            onclone: (clonedDoc) => {
                const style = clonedDoc.createElement('style');
                style.innerHTML = `
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box !important;
                    }
                    table {
                        border-collapse: collapse !important;
                    }
                `;
                clonedDoc.head.appendChild(style);
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.96);
        const contentHeight = (canvas.height * pdfWidth) / canvas.width;

        // Use natural content height if within A4, or exact A4 height
        const targetHeight = Math.min(contentHeight, pdfHeight);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, targetHeight, undefined, 'FAST');
    }

    pdf.save(filename);
    return true;
};

/**
 * Direct print using a dedicated hidden iframe.
 * Avoids printing the background app/dashboard, sidebar, or modals.
 */
export const printCatalogViaIframe = (containerEl, title = 'Price List & Order Sheet') => {
    if (!containerEl) return;

    let iframe = document.getElementById('catalog-print-iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'catalog-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.zIndex = '-9999';
        document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 8mm 10mm;
                }
                * {
                    box-sizing: border-box;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background: #ffffff;
                    color: #0f172a;
                }
                .catalog-pdf-page {
                    page-break-after: always;
                    break-after: page;
                    width: 100% !important;
                    max-width: 100% !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    margin-bottom: 20px;
                }
                .catalog-pdf-page:last-child {
                    page-break-after: avoid;
                    break-after: avoid;
                    margin-bottom: 0;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                }
            </style>
        </head>
        <body>
            ${containerEl.innerHTML}
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    }, 250);
};
