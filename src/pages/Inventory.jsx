import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, Package, Plus, AlertTriangle, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import InventoryStats from '../components/InventoryStats';

const Inventory = () => {
    const { items, updateItemStock, loading } = useData();
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [stockToAdd, setStockToAdd] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const filteredItems = items.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.sku?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const openAddStockModal = (item) => {
        setSelectedItem(item);
        setStockToAdd('');
        setIsModalOpen(true);
    };

    const handleAddStock = async (e) => {
        e.preventDefault();
        if (!selectedItem || !stockToAdd) return;

        const qty = parseFloat(stockToAdd);
        if (isNaN(qty) || qty <= 0) {
            addToast('Please enter a valid positive quantity', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await updateItemStock(selectedItem.id, qty);
            addToast('Stock updated successfully', 'success');
            setIsModalOpen(false);
            setSelectedItem(null);
            setStockToAdd('');
        } catch (error) {
            console.error(error);
            addToast('Failed to update stock', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Inventory Management</h1>
            </div>

            <InventoryStats items={items} />

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 mb-6 transition-colors duration-200">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search inventory by name or SKU..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium">
                            <tr>
                                <th className="px-6 py-3">Item Name</th>
                                <th className="px-6 py-3">SKU</th>
                                <th className="px-6 py-3">Current Stock</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => {
                                    const stock = parseFloat(item.stock) || 0;
                                    const minStock = parseFloat(item.minStock) || 5;
                                    const isLowStock = stock <= minStock;

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-3 font-medium text-gray-800 dark:text-white flex items-center gap-2">
                                                <Package className="h-4 w-4 text-gray-400" />
                                                {item.name}
                                            </td>
                                            <td className="px-6 py-3 font-mono text-xs">{item.sku || '-'}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${isLowStock ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'}`}>
                                                        {stock}
                                                    </span>
                                                    {isLowStock && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 px-1.5 py-0.5 rounded">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            Low
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <button
                                                    onClick={() => openAddStockModal(item)}
                                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                                                >
                                                    + Add Stock
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No items found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Stock Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Add Stock</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddStock}>
                            <div className="p-6 space-y-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-4">
                                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Updating: {selectedItem?.name}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">Current Stock: {selectedItem?.stock || 0}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Quantity to Add
                                    </label>
                                    <div className="relative">
                                        <Plus className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                        <input
                                            type="number"
                                            value={stockToAdd}
                                            onChange={(e) => setStockToAdd(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Enter quantity"
                                            min="0"
                                            step="1"
                                            autoFocus
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Enter negative value to reduce stock (e.g. -5)</p>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                                >
                                    {submitting ? 'Updating...' : 'Update Stock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
