import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import dbService from '../services/dbService';

const DataContext = createContext();

export const useData = () => {
    return useContext(DataContext);
};

export const DataProvider = ({ children }) => {
    const [customers, setCustomers] = useState([]);
    const [items, setItems] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        let loadedFlags = { customers: false, items: false, invoices: false, quotations: false };

        const checkFullyLoaded = () => {
            if (Object.values(loadedFlags).every(Boolean)) {
                setLoading(false);
            }
        };

        const unsubscribeCustomers = dbService.subscribeCustomers(
            (data) => {
                setCustomers(data || []);
                loadedFlags.customers = true;
                checkFullyLoaded();
            },
            (err) => {
                console.error("Customers sync error:", err);
                setError('Failed to sync customers');
                loadedFlags.customers = true;
                checkFullyLoaded();
            }
        );

        const unsubscribeItems = dbService.subscribeItems(
            (data) => {
                setItems(data || []);
                loadedFlags.items = true;
                checkFullyLoaded();
            },
            (err) => {
                console.error("Items sync error:", err);
                setError('Failed to sync items');
                loadedFlags.items = true;
                checkFullyLoaded();
            }
        );

        const unsubscribeInvoices = dbService.subscribeInvoices(
            (data) => {
                setInvoices(data || []);
                loadedFlags.invoices = true;
                checkFullyLoaded();
            },
            (err) => {
                console.error("Invoices sync error:", err);
                setError('Failed to sync invoices');
                loadedFlags.invoices = true;
                checkFullyLoaded();
            }
        );

        const unsubscribeQuotations = dbService.subscribeQuotations(
            (data) => {
                setQuotations(data || []);
                loadedFlags.quotations = true;
                checkFullyLoaded();
            },
            (err) => {
                console.error("Quotations sync error:", err);
                setError('Failed to sync quotations');
                loadedFlags.quotations = true;
                checkFullyLoaded();
            }
        );

        return () => {
            unsubscribeCustomers();
            unsubscribeItems();
            unsubscribeInvoices();
            unsubscribeQuotations();
        };
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
        // Data is always synced in real-time via onSnapshot subscriptions.
    }, []);

    const value = {
        customers,
        items,
        invoices,
        quotations,
        loading,
        error,
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
