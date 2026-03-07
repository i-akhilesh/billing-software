import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useData } from '../context/DataContext';

const TopItemsChart = ({ invoices }) => {
    const { items } = useData();

    // Process data for the chart
    const data = useMemo(() => {
        if (!invoices || invoices.length === 0) return [];

        const itemSales = {};

        // Aggregate sales by item
        invoices.forEach(inv => {
            if (inv.items) {
                inv.items.forEach(invItem => {
                    const itemId = invItem.itemId;
                    // Find actual item name in case "Unknown" logic needed
                    // But here we might just rely on itemId
                    if (!itemSales[itemId]) {
                        itemSales[itemId] = 0;
                    }
                    itemSales[itemId] += (parseFloat(invItem.quantity) || 0);
                });
            }
        });

        // Map to array and get names
        const chartData = Object.keys(itemSales).map(itemId => {
            const item = items.find(i => i.id === itemId);
            return {
                name: item ? item.name : 'Unknown',
                quantity: itemSales[itemId]
            };
        });

        // Sort by quantity and take top 5
        return chartData.sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    }, [invoices, items]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-center h-80">
                <p className="text-gray-400">No sales data available</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Selling Items</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{
                            top: 5,
                            right: 30,
                            left: 40,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="quantity" radius={[0, 4, 4, 0]} barSize={20}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default TopItemsChart;
