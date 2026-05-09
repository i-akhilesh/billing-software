
import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import CustomerModal from '../components/CustomerModal';
import ItemModal from '../components/ItemModal';
import SearchableSelect from '../components/SearchableSelect';

const InvoiceForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addInvoice, updateInvoice, invoices, customers, items, updateItemStock } = useData();
    const { addToast } = useToast();
    const isEditMode = !!id;

    // Modal States
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState(null);

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
            status: 'Draft',
            discount: 0,
            items: [{ itemId: '', quantity: 1, price: 0, taxRate: 0, total: 0 }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const watchItems = watch("items");
    const watchDiscount = watch("discount");

    // Calculate totals directly from watched values (re-calculates on every render)
    let subtotal = 0;
    let taxTotal = 0;

    (watchItems || []).forEach(item => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const taxRate = parseFloat(item.taxRate) || 0;

        const itemTotal = quantity * price;
        const itemTax = itemTotal * (taxRate / 100);

        subtotal += itemTotal;
        taxTotal += itemTax;
    });

    const discount = parseFloat(watchDiscount) || 0;
    const total = subtotal + taxTotal - discount;

    const totals = { subtotal, taxTotal, total };

    useEffect(() => {
        if (isEditMode) {
            const invoice = invoices.find(i => i.id === id);
            if (invoice) {
                // Ensure date format is correct for input type key
                const formattedInvoice = {
                    ...invoice,
                    date: format(new Date(invoice.date), 'yyyy-MM-dd'),
                    dueDate: format(new Date(invoice.dueDate), 'yyyy-MM-dd')
                };
                // We need to make sure items are populated correctly for the field array
                reset(formattedInvoice);
            } else {
                navigate('/invoices');
            }
        } else {
            // Generate Invoice Number (Simple)
            const nextNum = invoices.length + 1;
            setValue('invoiceNumber', `INV-${String(nextNum).padStart(3, '0')}`);
        }
    }, [id, invoices, isEditMode, navigate, reset, setValue]);

    const handleItemChange = (index, itemId) => {
        const item = items.find(i => i.id === itemId);
        if (item) {
            setValue(`items.${index}.name`, item.name, { shouldValidate: true });
            setValue(`items.${index}.price`, item.price, { shouldValidate: true });
            setValue(`items.${index}.taxRate`, item.taxRate, { shouldValidate: true });
            setValue(`items.${index}.description`, item.description, { shouldValidate: true });
        }
    };

    const handleCustomerSuccess = (newCustomer) => {
        setValue('customerId', newCustomer.id);
    };

    const handleItemSuccess = (newItem) => {
        if (activeItemIndex !== null) {
            setValue(`items.${activeItemIndex}.itemId`, newItem.id);
            handleItemChange(activeItemIndex, newItem.id);
            setActiveItemIndex(null);
        }
    };

    const onSubmit = async (data) => {
        const payload = {
            ...data,
            ...totals, // Use derived totals
            subtotal: totals.subtotal,
            taxTotal: totals.taxTotal,
            total: totals.total,
            // Ensure dates are ISO strings for storage
            date: new Date(data.date).toISOString(),
            dueDate: new Date(data.dueDate).toISOString()
        };

        try {
            if (isEditMode) {
                const originalInvoice = invoices.find(i => i.id === id);
                if (originalInvoice) {
                    // map original items for easy lookup
                    const originalItemsMap = new Map();
                    originalInvoice.items.forEach(item => {
                        originalItemsMap.set(item.itemId, parseFloat(item.quantity) || 0);
                    });

                    const processedItemIds = new Set();

                    // Handle Added or Modified items
                    for (const item of payload.items) {
                        const newItemId = item.itemId;
                        const newQty = parseFloat(item.quantity) || 0;

                        if (!newItemId) continue;
                        processedItemIds.add(newItemId);

                        const oldQty = originalItemsMap.get(newItemId) || 0;
                        const diff = newQty - oldQty;

                        if (diff !== 0) {
                            try {
                                // if diff is positive (added more), we deduct (-diff)
                                // if diff is negative (reduced), we add back (-(-val) = +val)
                                await updateItemStock(newItemId, -diff);
                            } catch (err) {
                                console.error(`Failed to update stock for item ${newItemId}`, err);
                            }
                        }
                    }

                    // Handle Removed items
                    for (const [itemId, oldQty] of originalItemsMap.entries()) {
                        if (!processedItemIds.has(itemId)) {
                            // Item was completely removed, add full stock back
                            try {
                                await updateItemStock(itemId, oldQty);
                            } catch (err) {
                                console.error(`Failed to restore stock for removed item ${itemId}`, err);
                            }
                        }
                    }
                }

                await updateInvoice(id, payload);
                addToast('Invoice updated successfully', 'success');
            } else {
                const newInvoice = await addInvoice(payload);

                // Deduct stock for each item
                for (const item of payload.items) {
                    if (item.itemId && item.quantity > 0) {
                        try {
                            await updateItemStock(item.itemId, -Math.abs(item.quantity));
                        } catch (err) {
                            console.error(`Failed to update stock for item ${item.itemId}`, err);
                            // Optionally warn user, but invoice is already created
                        }
                    }
                }

                addToast('Invoice created successfully', 'success');
            }
            navigate('/invoices');
        } catch (error) {
            console.error('Failed to save invoice', error);
            addToast('Failed to save invoice', 'error');
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link to="/invoices" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    {isEditMode ? 'Edit Invoice' : 'New Invoice'}
                </h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
                            <Controller
                                control={control}
                                name="customerId"
                                rules={{ required: 'Customer is required' }}
                                render={({ field: { onChange, value } }) => (
                                    <SearchableSelect
                                        options={customers.map(c => ({ value: c.id, label: c.name }))}
                                        value={value}
                                        onChange={onChange}
                                        onAddNew={() => setIsCustomerModalOpen(true)}
                                        placeholder="Select Customer"
                                        addNewLabel="Add New Customer"
                                    />
                                )}
                            />
                            {errors.customerId && <p className="text-red-500 text-xs mt-1">{errors.customerId.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Number</label>
                            <input
                                {...register('invoiceNumber', { required: 'Invoice Number is required' })}
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            {errors.invoiceNumber && <p className="text-red-500 text-xs mt-1">{errors.invoiceNumber.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Date</label>
                            <input
                                {...register('date', { required: 'Date is required' })}
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Items PO/SO</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium">
                                    <tr>
                                        <th className="px-4 py-2 w-1/3">Item Details</th>
                                        <th className="px-4 py-2 w-24">Qty</th>
                                        <th className="px-4 py-2 w-32">Price</th>
                                        <th className="px-4 py-2 w-24">Tax (%)</th>
                                        <th className="px-4 py-2 w-32 text-right">Amount</th>
                                        <th className="px-4 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {fields.map((field, index) => (
                                        <tr key={field.id}>
                                            <td className="px-4 py-2 align-top">
                                                <div className="mb-1">
                                                    <Controller
                                                        control={control}
                                                        name={`items.${index}.itemId`}
                                                        rules={{ required: 'Item required' }}
                                                        render={({ field: { onChange, value } }) => (
                                                            <SearchableSelect
                                                                options={items.map(item => ({ value: item.id, label: item.name }))}
                                                                value={value}
                                                                onChange={(val) => {
                                                                    onChange(val);
                                                                    handleItemChange(index, val);
                                                                }}
                                                                onAddNew={() => {
                                                                    setActiveItemIndex(index);
                                                                    setIsItemModalOpen(true);
                                                                }}
                                                                placeholder="Select Item"
                                                                addNewLabel="Add New Item"
                                                            />
                                                        )}
                                                    />
                                                </div>
                                                <textarea
                                                    {...register(`items.${index}.description`)}
                                                    placeholder="Description"
                                                    rows="1"
                                                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                ></textarea>
                                            </td>
                                            <td className="px-4 py-2 align-top">
                                                <input
                                                    {...register(`items.${index}.quantity`, {
                                                        min: 1,
                                                        validate: (value) => {
                                                            const itemId = watchItems[index]?.itemId;
                                                            if (!itemId) return true;
                                                            const item = items.find(i => i.id === itemId);
                                                            if (item && (parseFloat(value) > (parseFloat(item.stock) || 0))) {
                                                                return `Max: ${item.stock}`;
                                                            }
                                                            return true;
                                                        }
                                                    })}
                                                    type="number"
                                                    className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.items?.[index]?.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                />
                                                {errors.items?.[index]?.quantity && (
                                                    <p className="text-red-500 text-[10px] mt-1">{errors.items[index].quantity.message}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 align-top">
                                                <input
                                                    {...register(`items.${index}.price`)}
                                                    type="number"
                                                    step="0.01"
                                                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                />
                                            </td>
                                            <td className="px-4 py-2 align-top">
                                                <input
                                                    {...register(`items.${index}.taxRate`)}
                                                    type="number"
                                                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                />
                                            </td>
                                            <td className="px-4 py-2 align-top text-right font-medium text-gray-800 dark:text-white">
                                                ₹{((parseFloat(watchItems[index]?.quantity) || 0) * (parseFloat(watchItems[index]?.price) || 0)).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 align-top text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => remove(index)}
                                                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                                                    disabled={fields.length === 1}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button
                            type="button"
                            onClick={() => append({ itemId: '', quantity: 1, price: 0, taxRate: 0, total: 0 })}
                            className="mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-sm font-medium"
                        >
                            <Plus className="h-4 w-4" />
                            Add Line Item
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row justify-end border-t border-gray-100 dark:border-gray-700 pt-6">
                        <div className="w-full md:w-1/3 space-y-3">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Subtotal</span>
                                <span>₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Tax</span>
                                <span>₹{totals.taxTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                                <span>Discount</span>
                                <input
                                    {...register('discount')}
                                    type="number"
                                    className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="flex justify-between text-lg font-bold text-gray-800 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-3">
                                <span>Total</span>
                                <span>₹{totals.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-8 border-t border-gray-100 dark:border-gray-700 mt-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                            <select
                                {...register('status')}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="Draft">Draft</option>
                                <option value="Sent">Sent</option>
                                <option value="Paid">Paid</option>
                                <option value="Overdue">Overdue</option>
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <Link
                                to="/invoices"
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:bg-blue-400"
                            >
                                <Save className="h-4 w-4" />
                                {isSubmitting ? 'Saving...' : 'Save Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Modals */}
            <CustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSuccess={handleCustomerSuccess}
            />

            <ItemModal
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                onSuccess={handleItemSuccess}
            />
        </div>
    );
};

export default InvoiceForm;
