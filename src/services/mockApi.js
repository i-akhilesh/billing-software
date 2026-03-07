
// Mock API Service using localStorage

const DELAY = 500; // Simulated network delay

const generateId = () => Math.random().toString(36).substr(2, 9);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getStorage = (key) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

const setStorage = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- Seed Data ---
const seedData = () => {
    if (!localStorage.getItem('customers')) {
        const customers = [
            {
                id: 'c1',
                name: 'Delhi Public School, RK Puram',
                email: 'admin@dpsrkp.net',
                phone: '011-49115500',
                address: 'Sector XII, R.K. Puram, New Delhi',
                gst: '07AAATD1234A1Z5'
            },
            {
                id: 'c2',
                name: 'St. Xaviers High School',
                email: 'info@stxaviers.edu',
                phone: '022-22001122',
                address: 'Mahapalika Marg, Mumbai',
                gst: '27AABCS5678B1Z9'
            },
            {
                id: 'c3',
                name: 'Kendriya Vidyalaya No. 1',
                email: 'kv1@kvs.gov.in',
                phone: '080-12345678',
                address: 'Hebbal, Bengaluru',
                gst: '29AAACK1357C1Z2'
            }
        ];
        setStorage('customers', customers);
    }

    if (!localStorage.getItem('items')) {
        const items = [
            {
                id: 'i1',
                name: 'Classmate Notebook (A4, 180 Pages)',
                description: 'Single Line Ruled Notebook',
                price: 60,
                sku: 'NB-A4-180',
                taxRate: 12,
                stock: 100,
                minStock: 20,
                status: 'active'
            },
            {
                id: 'i2',
                name: 'Reynolds Ball Pen (Blue)',
                description: 'Pack of 5 Pens',
                price: 50,
                sku: 'PEN-BL-05',
                taxRate: 18,
                stock: 200,
                minStock: 50,
                status: 'active'
            },
            {
                id: 'i3',
                name: 'Camel Art Kit',
                description: 'Complete coloring kit for students',
                price: 450,
                sku: 'ART-KIT-01',
                taxRate: 12,
                stock: 15,
                minStock: 5,
                status: 'active'
            },
            {
                id: 'i4',
                name: 'Whiteboard Marker (Red/Blue/Black)',
                description: 'Pack of 3 markers',
                price: 120,
                sku: 'WB-MARKER-PK3',
                taxRate: 18,
                stock: 40,
                minStock: 10,
                status: 'active'
            },
            {
                id: 'i5',
                name: 'Exam Board (Transparent)',
                description: 'Standard size exam pad',
                price: 90,
                sku: 'EXAM-BD-TR',
                taxRate: 12,
                stock: 80,
                minStock: 15,
                status: 'active'
            }
        ];
        setStorage('items', items);
    }

    if (!localStorage.getItem('invoices')) {
        const invoices = [
            {
                id: 'inv1',
                invoiceNumber: 'INV-2024-001',
                customerId: 'c1',
                customerName: 'Delhi Public School, RK Puram',
                date: new Date().toISOString(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                items: [
                    { itemId: 'i1', name: 'Classmate Notebook (A4, 180 Pages)', quantity: 200, price: 60, taxRate: 12, total: 12000 }
                ],
                subtotal: 12000,
                taxTotal: 1440,
                discount: 0,
                total: 13440,
                status: 'Paid'
            }
        ];
        setStorage('invoices', invoices);
    }
};

// Initialize seed data
seedData();

// --- Generic CRUD ---
const mockApi = {
    // Customers
    getCustomers: async () => {
        await wait(DELAY);
        return getStorage('customers');
    },
    getCustomer: async (id) => {
        await wait(DELAY);
        const items = getStorage('customers');
        return items.find(i => i.id === id);
    },
    createCustomer: async (data) => {
        await wait(DELAY);
        const items = getStorage('customers');
        const newItem = { ...data, id: generateId() };
        items.push(newItem);
        setStorage('customers', items);
        return newItem;
    },
    updateCustomer: async (id, data) => {
        await wait(DELAY);
        const items = getStorage('customers');
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...data };
            setStorage('customers', items);
            return items[index];
        }
        throw new Error('Customer not found');
    },
    deleteCustomer: async (id) => {
        await wait(DELAY);
        let items = getStorage('customers');
        items = items.filter(i => i.id !== id);
        setStorage('customers', items);
        return true;
    },

    // Items
    getItems: async () => {
        await wait(DELAY);
        return getStorage('items');
    },
    createItem: async (data) => {
        await wait(DELAY);
        const items = getStorage('items');
        const newItem = { ...data, id: generateId() };
        items.push(newItem);
        setStorage('items', items);
        return newItem;
    },
    updateItem: async (id, data) => {
        await wait(DELAY);
        const items = getStorage('items');
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...data };
            setStorage('items', items);
            return items[index];
        }
        throw new Error('Item not found');
    },
    // New function to update stock
    updateItemStock: async (id, quantityData) => {
        // quantityData can be negative (reduce stock) or positive (add stock)
        await wait(DELAY);
        const items = getStorage('items');
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            const currentStock = items[index].stock || 0;
            const newStock = currentStock + quantityData;
            items[index] = { ...items[index], stock: newStock };
            setStorage('items', items);
            return items[index];
        }
        throw new Error('Item not found');
    },
    deleteItem: async (id) => {
        await wait(DELAY);
        let items = getStorage('items');
        items = items.filter(i => i.id !== id);
        setStorage('items', items);
        return true;
    },

    // Invoices
    getInvoices: async () => {
        await wait(DELAY);
        return getStorage('invoices');
    },
    getInvoice: async (id) => {
        await wait(DELAY);
        const items = getStorage('invoices');
        return items.find(i => i.id === id);
    },
    createInvoice: async (data) => {
        await wait(DELAY);
        const items = getStorage('invoices');
        // Simple auto-increment logic for invoice number could go here
        const newItem = { ...data, id: generateId() };
        items.push(newItem);
        setStorage('invoices', items);
        return newItem;
    },
    updateInvoice: async (id, data) => {
        await wait(DELAY);
        const items = getStorage('invoices');
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...data };
            setStorage('invoices', items);
            return items[index];
        }
        throw new Error('Invoice not found');
    },
    deleteInvoice: async (id) => {
        await wait(DELAY);
        let items = getStorage('invoices');
        items = items.filter(i => i.id !== id);
        setStorage('invoices', items);
        return true;
    },

    // Payment Methods
    addPayment: async (invoiceId, paymentData) => {
        await wait(DELAY);
        const invoices = getStorage('invoices');
        const index = invoices.findIndex(i => i.id === invoiceId);
        if (index !== -1) {
            const invoice = invoices[index];
            const newPayment = {
                id: generateId(),
                date: new Date().toISOString(),
                ...paymentData
            };

            // Initialize payments array if not exists
            const payments = invoice.payments || [];
            payments.push(newPayment);

            // Recalculate status
            const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const totalAmount = parseFloat(invoice.total) || 0;

            let status = 'Sent';
            if (totalPaid >= totalAmount - 1) { // -1 for small floating point diffs
                status = 'Paid';
            } else if (totalPaid > 0) {
                status = 'Partial';
            }

            invoices[index] = { ...invoice, payments, status };
            setStorage('invoices', invoices);
            return invoices[index];
        }
        throw new Error('Invoice not found');
    }
};

export default mockApi;
