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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            const [customersData, itemsData, invoicesData] = await Promise.all([
                dbService.getCustomers(),
                dbService.getItems(),
                dbService.getInvoices()
            ]);
            setCustomers(customersData || []);
            setItems(itemsData || []);
            setInvoices(invoicesData || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const addCustomer = async (data) => {
        try {
            const newCustomer = await dbService.createCustomer(data);
            setCustomers(prev => [...prev, newCustomer]);
            return newCustomer;
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const updateCustomer = async (id, data) => {
        try {
            const updated = await dbService.updateCustomer(id, data);
            setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
            return updated;
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const deleteCustomer = async (id) => {
        try {
            await dbService.deleteCustomer(id);
            setCustomers(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    // --- Items ---
    const addItem = async (data) => {
        try {
            const newItem = await dbService.createItem(data);
            setItems(prev => [...prev, newItem]);
            return newItem;
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const updateItem = async (id, data) => {
        try {
            const updated = await dbService.updateItem(id, data);
            setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
            return updated;
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const deleteItem = async (id) => {
        try {
            await dbService.deleteItem(id);
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    // --- Invoices ---
    const addInvoice = async (data) => {
        try {
            const newInvoice = await dbService.createInvoice(data);
            setInvoices(prev => [...prev, newInvoice]);
            return newInvoice;
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const updateInvoice = async (id, data) => {
        try {
            const updated = await dbService.updateInvoice(id, data);
            setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
            return updated;
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const deleteInvoice = async (id) => {
        try {
            await dbService.deleteInvoice(id);
            setInvoices(prev => prev.filter(i => i.id !== id));
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const addPayment = async (invoiceId, paymentData) => {
        try {
            const updatedInvoice = await dbService.addPayment(invoiceId, paymentData);
            setInvoices(prev => prev.map(i => i.id === invoiceId ? updatedInvoice : i));
            return updatedInvoice;
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const value = {
        customers,
        items,
        invoices,
        loading,
        error,
        refreshData,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addItem,
        updateItem,
        deleteItem,
        updateItemStock: dbService.updateItemStock,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        addPayment
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
