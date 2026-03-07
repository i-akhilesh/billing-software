
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

const ItemForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addItem, updateItem, items } = useData();
    const { addToast } = useToast();
    const isEditMode = !!id;

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            status: 'active',
            taxRate: 0,
            price: 0
        }
    });

    useEffect(() => {
        if (isEditMode) {
            const item = items.find(i => i.id === id);
            if (item) {
                reset(item);
            } else {
                navigate('/items');
            }
        }
    }, [id, items, isEditMode, navigate, reset]);

    const onSubmit = async (data) => {
        // Convert numbers
        data.price = parseFloat(data.price);
        data.taxRate = parseFloat(data.taxRate);

        try {
            if (isEditMode) {
                await updateItem(id, data);
                addToast('Item updated successfully', 'success');
            } else {
                await addItem(data);
                addToast('Item added successfully', 'success');
            }
            navigate('/items');
        } catch (error) {
            console.error('Failed to save item', error);
            addToast('Failed to save item', 'error');
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link to="/items" className="text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">
                    {isEditMode ? 'Edit Item' : 'Add New Item'}
                </h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                            <input
                                {...register('name', { required: 'Name is required' })}
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Service or Product Name"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Code</label>
                            <input
                                {...register('sku')}
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="PROD-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
                            <input
                                {...register('price', {
                                    required: 'Price is required',
                                    min: { value: 0, message: 'Price must be positive' }
                                })}
                                type="number"
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
                        </div>

                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                        <input
                            {...register('taxRate', {
                                min: { value: 0, message: 'Tax rate must be positive' }
                            })}
                            type="number"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                        <input
                            {...register('stock', {
                                min: { value: 0, message: 'Stock must be positive' }
                            })}
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert Level</label>
                        <input
                            {...register('minStock', {
                                min: { value: 0, message: 'Must be positive' }
                            })}
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="5"
                        />
                    </div>


                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            {...register('description')}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Item description..."
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            {...register('status')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Link
                            to="/items"
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:bg-blue-400"
                        >
                            <Save className="h-4 w-4" />
                            {isSubmitting ? 'Saving...' : 'Save Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ItemForm;
