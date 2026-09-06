import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import CustomerModal from '../components/CustomerModal';
import ItemModal from '../components/ItemModal';
import SearchableSelect from '../components/SearchableSelect';

const QuotationForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addQuotation, updateQuotation, quotations, customers, items } = useData();
    const { addToast } = useToast();
    const isEditMode = !!id;

    // Modal States
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState(null);

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            validUntil: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
            status: 'Active',
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
    const total = Math.max(0, subtotal + taxTotal - discount);

    const totals = { subtotal, taxTotal, total };

    useEffect(() => {
        if (isEditMode) {
            const quotation = quotations.find(q => q.id === id);
            if (quotation) {
                const formattedQuotation = {
                    ...quotation,
                    date: quotation.date ? format(new Date(quotation.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                    validUntil: quotation.validUntil ? format(new Date(quotation.validUntil), 'yyyy-MM-dd') : format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
                };
                reset(formattedQuotation);
            } else {
                navigate('/quotations');
            }
        } else {
            const nextNum = (quotations?.length || 0) + 1;
            setValue('quotationNumber', `QT-${String(nextNum).padStart(3, '0')}`);
        }
    }, [id, quotations, isEditMode, navigate, reset, setValue]);

    const handleItemChange = (index, itemId) => {
        const item = items.find(i => i.id === itemId);
        if (item) {
            setValue(`items.${index}.name`, item.name, { shouldValidate: true });
            setValue(`items.${index}.price`, item.price, { shouldValidate: true });
            setValue(`items.${index}.taxRate`, item.taxRate || 0, { shouldValidate: true });
            setValue(`items.${index}.description`, item.description || '', { shouldValidate: true });
        }
    };

    const handleCustomerSuccess = (newCustomer) => {
        setValue('customerId', newCustomer.id);
        setValue('customerName', newCustomer.name);
    };

    const handleItemSuccess = (newItem) => {
        if (activeItemIndex !== null) {
            setValue(`items.${activeItemIndex}.itemId`, newItem.id);
            handleItemChange(activeItemIndex, newItem.id);
            setActiveItemIndex(null);
        }
    };

    const onSubmit = async (data) => {
        const selectedCust = customers.find(c => c.id === data.customerId);
        const payload = {
            ...data,
            customerName: selectedCust ? selectedCust.name : data.customerName,
            ...totals,
            date: new Date(data.date).toISOString(),
            validUntil: new Date(data.validUntil).toISOString()
        };

        try {
            if (isEditMode) {
                await updateQuotation(id, payload);
                addToast('Quotation updated successfully', 'success');
            } else {
                const newQuotation = await addQuotation(payload);
                addToast('Quotation created successfully', 'success');
                navigate(`/quotations/${newQuotation.id}`);
                return;
            }
            navigate('/quotations');
        } catch (error) {
            console.error('Failed to save quotation', error);
            addToast('Failed to save quotation', 'error');
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link to="/quotations" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {isEditMode ? 'Edit Quotation' : 'New Quotation'}
                    </h1>
                    <p className="text-xs text-gray-500">Create itemized quotation to auto-generate 3-store bids</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                                        onChange={(val) => {
                                            onChange(val);
                                            const c = customers.find(item => item.id === val);
                                            if (c) setValue('customerName', c.name);
                                        }}
                                        onAddNew={() => setIsCustomerModalOpen(true)}
                                        placeholder="Select Customer"
                                        addNewLabel="Add New Customer"
                                    />
                                )}
                            />
                            {errors.customerId && <p className="text-red-500 text-xs mt-1">{errors.customerId.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quotation Number</label>
                            <input
                                {...register('quotationNumber', { required: 'Quotation Number is required' })}
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                            {errors.quotationNumber && <p className="text-red-500 text-xs mt-1">{errors.quotationNumber.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quotation Date</label>
                            <input
                                {...register('date', { required: 'Date is required' })}
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid Until</label>
                            <input
                                {...register('validUntil')}
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                            <select
                                {...register('status')}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            >
                                <option value="Active">Active</option>
                                <option value="Sent">Sent</option>
                                <option value="Accepted">Accepted</option>
                                <option value="Expired">Expired</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quotation Items</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium">
                                    <tr>
                                        <th className="px-4 py-2 w-1/3">Item</th>
                                        <th className="px-4 py-2 w-24">Qty</th>
                                        <th className="px-4 py-2 w-32">Rate (₹)</th>
                                        <th className="px-4 py-2 w-32">Amount (₹)</th>
                                        <th className="px-4 py-2 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {fields.map((field, index) => {
                                        const qty = parseFloat(watchItems?.[index]?.quantity) || 0;
                                        const price = parseFloat(watchItems?.[index]?.price) || 0;
                                        const amount = qty * price;

                                        return (
                                            <tr key={field.id}>
                                                <td className="px-4 py-2">
                                                    <Controller
                                                        control={control}
                                                        name={`items.${index}.itemId`}
                                                        rules={{ required: 'Item is required' }}
                                                        render={({ field: { onChange, value } }) => (
                                                            <SearchableSelect
                                                                options={items.map(i => ({ value: i.id, label: `${i.name} (₹${i.price})` }))}
                                                                value={value}
                                                                onChange={(val) => {
                                                                    onChange(val);
                                                                    handleItemChange(index, val);
                                                                }}
                                                                onAddNew={() => {
                                                                    setActiveItemIndex(index);
                                                                    setIsItemModalOpen(true);
                                                                }}
                                                                placeholder="Select Product/Item"
                                                                addNewLabel="Add New Item"
                                                            />
                                                        )}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        {...register(`items.${index}.quantity`, { required: true, min: 1 })}
                                                        type="number"
                                                        step="any"
                                                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        {...register(`items.${index}.price`, { required: true, min: 0 })}
                                                        type="number"
                                                        step="any"
                                                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 font-medium">
                                                    ₹{amount.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    {fields.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => remove(index)}
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <button
                            type="button"
                            onClick={() => append({ itemId: '', quantity: 1, price: 0, taxRate: 0, total: 0 })}
                            className="mt-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" /> Add Item Line
                        </button>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="w-full md:w-72 space-y-3">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Subtotal:</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                                <input
                                    {...register('discount')}
                                    type="number"
                                    step="any"
                                    className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex justify-between text-lg font-bold text-gray-800 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-2">
                                <span>Total Quote:</span>
                                <span className="text-blue-600 dark:text-blue-400">₹{total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Link to="/quotations" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {isSubmitting ? 'Saving...' : 'Save & Generate 3 Bids'}
                    </button>
                </div>
            </form>

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

export default QuotationForm;
