import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';

const PaymentModal = ({ isOpen, onClose, invoice, onRecordPayment }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
        defaultValues: {
            amount: '',
            date: new Date().toISOString().split('T')[0],
            mode: 'UPI',
            reference: ''
        }
    });

    if (!isOpen || !invoice) return null;

    // Calculate remaining amount
    const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const remainingAmount = (parseFloat(invoice.total) || 0) - totalPaid;

    const onSubmit = async (data) => {
        await onRecordPayment(invoice.id, {
            ...data,
            amount: parseFloat(data.amount)
        });
        reset();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Record Payment</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md mb-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-300">Invoice Amount:</span>
                            <span className="font-medium">₹{invoice.total?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-300">Total Paid:</span>
                            <span className="font-medium text-green-600">₹{totalPaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold pt-2 border-t border-blue-100 dark:border-blue-800">
                            <span className="text-blue-800 dark:text-blue-300">Balance Due:</span>
                            <span className="text-blue-800 dark:text-blue-300">₹{remainingAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                        <input
                            {...register('amount', {
                                required: 'Amount is required',
                                max: { value: remainingAmount + 1, message: 'Amount exceeds balance' },
                                min: { value: 1, message: 'Amount must be positive' }
                            })}
                            type="number"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Enter amount"
                        />
                        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date</label>
                        <input
                            {...register('date', { required: 'Date is required' })}
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Mode</label>
                        <select
                            {...register('mode')}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference ID / Note</label>
                        <input
                            {...register('reference')}
                            type="text"
                            placeholder="e.g., Transaction ID"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                        >
                            {isSubmitting ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentModal;
