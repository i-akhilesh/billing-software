import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';

const RevenueChart = ({ invoices }) => {

    // Process data for the chart
    const data = useMemo(() => {
        if (!invoices || invoices.length === 0) return [];

        // Sort invoices by date
        const sortedInvoices = [...invoices].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Group by Date
        const groupedData = sortedInvoices.reduce((acc, inv) => {
            const dateStr = format(parseISO(inv.date), 'MMM dd');
            if (!acc[dateStr]) {
                acc[dateStr] = 0;
            }
            acc[dateStr] += inv.total || 0;
            return acc;
        }, {});

        // Transform to array
        return Object.keys(groupedData).map(date => ({
            name: date,
            revenue: groupedData[date]
        }));
    }, [invoices]);

    if (data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-center h-80">
                <p className="text-gray-400">No data available for chart</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Trend</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                        <Tooltip
                            formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RevenueChart;
