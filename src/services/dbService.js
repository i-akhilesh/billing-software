import { db } from './firebase';
import {
    collection,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    runTransaction
} from 'firebase/firestore';

// Collection Names
const COLLECTIONS = {
    CUSTOMERS: 'customers',
    ITEMS: 'items',
    INVOICES: 'invoices',
    COUNTERS: 'counters' // New collection for tracking IDs
};

// Helper: Generate Next Sequential ID (Atomic)
const generateNextId = async (collectionName, prefix) => {
    const counterRef = doc(db, COLLECTIONS.COUNTERS, collectionName);

    try {
        return await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let nextCount = 1;

            if (counterDoc.exists()) {
                nextCount = counterDoc.data().count + 1;
            } else {
                // First time? Try to find max ID from existing docs to be safe
                // This is a one-time heal step if migration happened without counters
                const q = query(collection(db, collectionName)); // Grab all (expensive if huge, but fine for now)
                const snapshot = await getDocs(q);
                let maxId = 0;
                snapshot.forEach(doc => {
                    // Extract number from id (e.g., 'c5' -> 5)
                    const idPart = parseInt(doc.id.replace(prefix, ''));
                    if (!isNaN(idPart) && idPart > maxId) {
                        maxId = idPart;
                    }
                });
                nextCount = maxId + 1;
            }

            transaction.set(counterRef, { count: nextCount });
            return `${prefix}${nextCount}`;
        });
    } catch (e) {
        console.error("Error generating ID:", e);
        // Fallback to random if transaction fails (avoids blocking app)
        return `${prefix}_${Date.now()}`;
    }
};

const dbService = {
    // --- Customers ---
    getCustomers: async () => {
        try {
            const q = query(collection(db, COLLECTIONS.CUSTOMERS), orderBy('name'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting customers:", error);
            throw error;
        }
    },

    createCustomer: async (data) => {
        try {
            const newId = await generateNextId(COLLECTIONS.CUSTOMERS, 'c');
            const docRef = doc(db, COLLECTIONS.CUSTOMERS, newId);
            await setDoc(docRef, { ...data, id: newId }); // Store ID inside doc too
            return { id: newId, ...data };
        } catch (error) {
            console.error("Error creating customer:", error);
            throw error;
        }
    },

    updateCustomer: async (id, data) => {
        try {
            const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
            await updateDoc(docRef, data);
            return { id, ...data };
        } catch (error) {
            console.error("Error updating customer:", error);
            throw error;
        }
    },

    deleteCustomer: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTIONS.CUSTOMERS, id));
            return true;
        } catch (error) {
            console.error("Error deleting customer:", error);
            throw error;
        }
    },

    // --- Items ---
    getItems: async () => {
        try {
            const q = query(collection(db, COLLECTIONS.ITEMS), orderBy('name'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting items:", error);
            throw error;
        }
    },

    createItem: async (data) => {
        try {
            const newId = await generateNextId(COLLECTIONS.ITEMS, 'i');
            const docRef = doc(db, COLLECTIONS.ITEMS, newId);
            await setDoc(docRef, { ...data, id: newId });
            return { id: newId, ...data };
        } catch (error) {
            console.error("Error creating item:", error);
            throw error;
        }
    },

    updateItem: async (id, data) => {
        try {
            const docRef = doc(db, COLLECTIONS.ITEMS, id);
            await updateDoc(docRef, data);
            return { id, ...data };
        } catch (error) {
            console.error("Error updating item:", error);
            throw error;
        }
    },

    updateItemStock: async (id, quantityData) => {
        try {
            const docRef = doc(db, COLLECTIONS.ITEMS, id);
            // Ideally use transactions, but for now read-update
            const snapshot = await getDocs(query(collection(db, COLLECTIONS.ITEMS), where('__name__', '==', id)));
            if (snapshot.empty) throw new Error('Item not found');

            const item = snapshot.docs[0].data();
            const currentStock = parseFloat(item.stock) || 0;
            const newStock = currentStock + quantityData;

            await updateDoc(docRef, { stock: newStock });
            return { ...item, id, stock: newStock };
        } catch (error) {
            console.error("Error updating stock:", error);
            throw error;
        }
    },

    deleteItem: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTIONS.ITEMS, id));
            return true;
        } catch (error) {
            console.error("Error deleting item:", error);
            throw error;
        }
    },

    // --- Invoices ---
    getInvoices: async () => {
        try {
            // Order by date descending
            const q = query(collection(db, COLLECTIONS.INVOICES), orderBy('date', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting invoices:", error);
            // Fallback for empty collection or index errors
            return [];
        }
    },

    createInvoice: async (data) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.INVOICES), data);
            return { id: docRef.id, ...data };
        } catch (error) {
            console.error("Error creating invoice:", error);
            throw error;
        }
    },

    updateInvoice: async (id, data) => {
        try {
            const docRef = doc(db, COLLECTIONS.INVOICES, id);
            await updateDoc(docRef, data);
            return { id, ...data };
        } catch (error) {
            console.error("Error updating invoice:", error);
            throw error;
        }
    },

    deleteInvoice: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTIONS.INVOICES, id));
            return true;
        } catch (error) {
            console.error("Error deleting invoice:", error);
            throw error;
        }
    },

    addPayment: async (invoiceId, paymentData) => {
        try {
            const docRef = doc(db, COLLECTIONS.INVOICES, invoiceId);
            const snapshot = await getDocs(query(collection(db, COLLECTIONS.INVOICES), where('__name__', '==', invoiceId)));

            if (snapshot.empty) throw new Error('Invoice not found');

            const invoice = snapshot.docs[0].data();
            const newPayment = {
                id: Math.random().toString(36).substr(2, 9), // Generate ID locally
                date: new Date().toISOString(),
                ...paymentData
            };

            const payments = invoice.payments || [];
            payments.push(newPayment);

            // Recalculate status
            const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const totalAmount = parseFloat(invoice.total) || 0;

            let status = 'Sent';
            if (totalPaid >= totalAmount - 1) {
                status = 'Paid';
            } else if (totalPaid > 0) {
                status = 'Partial';
            }

            await updateDoc(docRef, { payments, status });
            return { ...invoice, id: invoiceId, payments, status };
        } catch (error) {
            console.error("Error adding payment:", error);
            throw error;
        }
    }
};

export default dbService;
