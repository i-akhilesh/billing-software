import { useState } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const DataMigration = () => {
    const [status, setStatus] = useState('idle');
    const [logs, setLogs] = useState([]);
    const { user } = useAuth();

    const addLog = (msg) => setLogs(prev => [...prev, msg]);

    const handleMigration = async () => {
        if (!user || user.role !== 'admin') {
            addLog("Error: Only Admin can perform migration.");
            return;
        }

        if (!window.confirm("This will overwrite cloud data with your local data. Continue?")) {
            return;
        }

        setStatus('migrating');
        addLog("Starting migration...");

        try {
            // 1. Read Local Data
            const customers = JSON.parse(localStorage.getItem('customers') || '[]');
            const items = JSON.parse(localStorage.getItem('items') || '[]');
            const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');

            addLog(`Found: ${customers.length} Customers, ${items.length} Items, ${invoices.length} Invoices.`);

            // 2. Upload Customers
            addLog("Syncing Customers...");
            await Promise.all(customers.map(async (c) => {
                await setDoc(doc(db, 'customers', c.id), c);
            }));

            // 3. Upload Items
            addLog("Syncing Items...");
            await Promise.all(items.map(async (i) => {
                await setDoc(doc(db, 'items', i.id), i);
            }));

            // 4. Upload Invoices
            addLog("Syncing Invoices...");
            await Promise.all(invoices.map(async (inv) => {
                await setDoc(doc(db, 'invoices', inv.id), inv);
            }));

            setStatus('done');
            addLog("Migration Complete! Database is now live in the cloud.");
            addLog("Please refresh the page to start using the cloud data.");

        } catch (error) {
            console.error(error);
            setStatus('error');
            addLog(`Error: ${error.message}`);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg border border-purple-100 max-w-2xl mx-auto my-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Use Cloud Database</h2>
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold">Admin Only</span>
            </div>

            <p className="mb-6 text-gray-600">
                Sync your local data to the Google Firebase Cloud.
                This will make your data available on all devices where you log in as Admin.
            </p>

            <div className="bg-gray-900 text-green-400 p-4 rounded-md h-48 overflow-y-auto mb-6 font-mono text-xs shadow-inner">
                {logs.length === 0 ? "> Ready to initialize cloud sync..." : logs.map((l, i) => <div key={i} className="mb-1">{`> ${l}`}</div>)}
            </div>

            <button
                onClick={handleMigration}
                disabled={status === 'migrating' || status === 'done'}
                className={`w-full py-3 rounded-md font-semibold transition-colors ${status === 'done'
                        ? 'bg-green-600 text-white cursor-default'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    } disabled:opacity-50`}
            >
                {status === 'migrating' ? 'Syncing Data...' : status === 'done' ? 'Sync Complete' : 'Sync Local Data to Cloud'}
            </button>
        </div>
    );
};

export default DataMigration;
