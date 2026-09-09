import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import dbService from '../services/dbService';

const DataContext = createContext();

export const useData = () => {
    return useContext(DataContext);
};

// Helper to safely load backup data from localStorage
const getBackup = (key) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch (e) {
        return [];
    }
};

export const DataProvider = ({ children }) => {
    // Initialize with local backups if available for instant display
    const [customers, setCustomers] = useState(() => getBackup('customers_backup'));
    const [items, setItems] = useState(() => getBackup('items_backup'));
    const [invoices, setInvoices] = useState(() => getBackup('invoices_backup'));
    const [quotations, setQuotations] = useState(() => getBackup('quotations_backup'));

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [syncStatus, setSyncStatus] = useState('syncing'); // 'synced' | 'syncing' | 'offline' | 'error'
    const [lastSyncedAt, setLastSyncedAt] = useState(null);
    const [hasPendingWrites, setHasPendingWrites] = useState(false);

    // Monitor Online/Offline window events
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setSyncStatus('syncing');
            // Trigger background sync when coming online
            dbService.syncLocalToCloud().catch(err => console.error("Online re-sync error:", err));
        };

        const handleOffline = () => {
            setIsOnline(false);
            setSyncStatus('offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Main real-time Firestore sync subscriptions
    useEffect(() => {
        setLoading(true);
        let loadedFlags = { customers: false, items: false, invoices: false, quotations: false };
        let metadataMap = { customers: null, items: null, invoices: null, quotations: null };

        const updateSyncState = () => {
            const allLoaded = Object.values(loadedFlags).every(Boolean);
            if (allLoaded) {
                setLoading(false);
            }

            const anyPending = Object.values(metadataMap).some(m => m && m.hasPendingWrites);
            setHasPendingWrites(anyPending);

            if (!navigator.onLine) {
                setSyncStatus('offline');
            } else if (anyPending) {
                setSyncStatus('syncing');
            } else if (allLoaded) {
                setSyncStatus('synced');
                setLastSyncedAt(new Date());
            }
        };

        const unsubscribeCustomers = dbService.subscribeCustomers(
            (data, metadata) => {
                setCustomers(data || []);
                loadedFlags.customers = true;
                metadataMap.customers = metadata;
                updateSyncState();
            },
            (err) => {
                console.error("Customers sync error:", err);
                setError('Failed to sync customers');
                loadedFlags.customers = true;
                setSyncStatus('error');
                updateSyncState();
            }
        );

        const unsubscribeItems = dbService.subscribeItems(
            (data, metadata) => {
                setItems(data || []);
                loadedFlags.items = true;
                metadataMap.items = metadata;
                updateSyncState();
            },
            (err) => {
                console.error("Items sync error:", err);
                setError('Failed to sync items');
                loadedFlags.items = true;
                setSyncStatus('error');
                updateSyncState();
            }
        );

        const unsubscribeInvoices = dbService.subscribeInvoices(
            (data, metadata) => {
                setInvoices(data || []);
                loadedFlags.invoices = true;
                metadataMap.invoices = metadata;
                updateSyncState();
            },
            (err) => {
                console.error("Invoices sync error:", err);
                setError('Failed to sync invoices');
                loadedFlags.invoices = true;
                setSyncStatus('error');
                updateSyncState();
            }
        );

        const unsubscribeQuotations = dbService.subscribeQuotations(
            (data, metadata) => {
                setQuotations(data || []);
                loadedFlags.quotations = true;
                metadataMap.quotations = metadata;
                updateSyncState();
            },
            (err) => {
                console.error("Quotations sync error:", err);
                setError('Failed to sync quotations');
                loadedFlags.quotations = true;
                setSyncStatus('error');
                updateSyncState();
            }
        );

        // Auto sync local storage data to Cloud on startup
        dbService.syncLocalToCloud().catch(err => console.error("Initial auto-sync error:", err));

        return () => {
            unsubscribeCustomers();
            unsubscribeItems();
            unsubscribeInvoices();
            unsubscribeQuotations();
        };
    }, []);

    // Manual Force Sync
    const forceSync = useCallback(async () => {
        setSyncStatus('syncing');
        try {
            const res = await dbService.syncLocalToCloud();
            setLastSyncedAt(new Date());
            setSyncStatus(navigator.onLine ? 'synced' : 'offline');
            return res;
        } catch (err) {
            console.error("Force sync failed:", err);
            setSyncStatus('error');
            throw err;
        }
    }, []);

    // Helper CRUD actions - Firestore onSnapshot updates the React state automatically
    const addCustomer = async (data) => dbService.createCustomer(data);
    const updateCustomer = async (id, data) => dbService.updateCustomer(id, data);
    const deleteCustomer = async (id) => dbService.deleteCustomer(id);

    const addItem = async (data) => dbService.createItem(data);
    const updateItem = async (id, data) => dbService.updateItem(id, data);
    const deleteItem = async (id) => dbService.deleteItem(id);
    const updateItemStock = async (id, quantityData) => dbService.updateItemStock(id, quantityData);

    const addInvoice = async (data) => dbService.createInvoice(data);
    const updateInvoice = async (id, data) => dbService.updateInvoice(id, data);
    const deleteInvoice = async (id) => dbService.deleteInvoice(id);
    const addPayment = async (invoiceId, paymentData) => dbService.addPayment(invoiceId, paymentData);

    const addQuotation = async (data) => dbService.createQuotation(data);
    const updateQuotation = async (id, data) => dbService.updateQuotation(id, data);
    const deleteQuotation = async (id) => dbService.deleteQuotation(id);

    const refreshData = useCallback(() => {
        return forceSync();
    }, [forceSync]);

    const value = {
        customers,
        items,
        invoices,
        quotations,
        loading,
        error,
        isOnline,
        syncStatus,
        lastSyncedAt,
        hasPendingWrites,
        forceSync,
        refreshData,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addItem,
        updateItem,
        deleteItem,
        updateItemStock,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        addPayment,
        addQuotation,
        updateQuotation,
        deleteQuotation
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

