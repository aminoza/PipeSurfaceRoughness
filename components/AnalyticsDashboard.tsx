import React, { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot } from '../firebase';
import { InspectionData } from '../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart2, TrendingUp, AlertTriangle } from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<InspectionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Limit to last 50 entries for chart clarity
    const q = query(collection(db, "inspections"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawData = snapshot.docs.map(doc => ({
         ...doc.data()
      } as InspectionData));
      setData(rawData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center text-gray-400">Loading Analytics...</div>;

  // Process data for charts
  const recentData = data.slice(-20); // Last 20 records
  
  const avgRating = data.length > 0 
    ? (data.reduce((acc, curr) => acc + curr.rating, 0) / data.length).toFixed(2)
    : "0.00";

  // Score 4 and 5 are considered high roughness/bad in 1-5 scale
  const highRoughnessCount = data.filter(d => d.rating >= 4).length;

  return (
    <div className="space-y-6">
       {/* Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                 <p className="text-sm text-gray-500 font-medium">Total Inspections</p>
                 <h3 className="text-3xl font-bold text-gray-800">{data.length}</h3>
              </div>
              <div className="bg-blue-50 p-3 rounded-full text-blue-600">
                <BarChart2 className="w-6 h-6" />
              </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                 <p className="text-sm text-gray-500 font-medium">Avg Score</p>
                 <h3 className="text-3xl font-bold text-gray-800">{avgRating}</h3>
              </div>
              <div className="bg-green-50 p-3 rounded-full text-green-600">
                <TrendingUp className="w-6 h-6" />
              </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                 <p className="text-sm text-gray-500 font-medium">High Roughness ({'>='}4)</p>
                 <h3 className="text-3xl font-bold text-gray-800">{highRoughnessCount}</h3>
              </div>
              <div className="bg-orange-50 p-3 rounded-full text-orange-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
          </div>
       </div>

       {/* Chart */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Recent Roughness Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recentData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="lot" 
                    stroke="#9ca3af" 
                    tick={{fontSize: 12}} 
                    tickFormatter={(value) => {
                      const val = String(value);
                      return val.length > 8 ? val.substring(0,8)+'...' : val;
                    }}
                />
                <YAxis stroke="#9ca3af" tick={{fontSize: 12}} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                />
                <Line 
                    type="monotone" 
                    dataKey="rating" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
       </div>
    </div>
  );
};