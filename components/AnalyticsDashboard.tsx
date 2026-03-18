import React, { useEffect, useState, useMemo } from 'react';
import { db, collection, query, orderBy, onSnapshot } from '../firebase';
import { InspectionData } from '../types';
import { BarChart2, ScatterChart, Settings2 } from 'lucide-react';

// --- Statistical Helper Functions ---
const calculateMean = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

const calculateMedian = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const calculateMode = (values: number[]) => {
  if (values.length === 0) return 0;
  const counts: Record<number, number> = {};
  let maxFreq = 0;
  let mode = values[0];
  values.forEach(v => {
    counts[v] = (counts[v] || 0) + 1;
    if (counts[v] > maxFreq) {
      maxFreq = counts[v];
      mode = v;
    }
  });
  return mode;
};

const calculateQuartiles = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = calculateMedian(sorted);
  
  const mid = Math.floor(sorted.length / 2);
  const lowerHalf = sorted.slice(0, mid);
  const upperHalf = sorted.length % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);
  
  const q1 = calculateMedian(lowerHalf);
  const q3 = calculateMedian(upperHalf);

  return { min, q1, median, q3, max };
};

// --- Types ---
type ChartType = 'box' | 'scatter' | 'combined';
type AggregationType = 'mean' | 'median' | 'mode';

// --- Types ---


export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<InspectionData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Controls
  const [chartType, setChartType] = useState<ChartType>('combined');
  const [aggType, setAggType] = useState<AggregationType>('mean');

  // Unified filters (from table columns)
  const [tableFilters, setTableFilters] = useState({
    date: '',
    tester: '',
    grade: '',
    lot: '',
    rating: ''
  });

  useEffect(() => {
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

  // --- Derived Data ---
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const dateStr = `${item.date} ${item.time}`;
      const dateMatch = tableFilters.date === '' || dateStr === tableFilters.date;
      const testerMatch = tableFilters.tester === '' || item.tester === tableFilters.tester;
      const gradeMatch = tableFilters.grade === '' || item.grade === tableFilters.grade;
      const lotMatch = tableFilters.lot === '' || item.lot === tableFilters.lot;
      const ratingMatch = tableFilters.rating === '' || item.rating.toString() === tableFilters.rating;
      
      return dateMatch && testerMatch && gradeMatch && lotMatch && ratingMatch;
    });
  }, [data, tableFilters]);

  const overallStats = useMemo(() => {
    const ratings = filteredData.map(d => d.rating);
    return {
      mean: calculateMean(ratings),
      median: calculateMedian(ratings),
      mode: calculateMode(ratings),
      count: ratings.length
    };
  }, [filteredData]);

  const uniqueTableValues = useMemo(() => {
    return {
      dates: Array.from(new Set(data.map(d => `${d.date} ${d.time}`))).sort(),
      testers: Array.from(new Set(data.map(d => d.tester))).sort(),
      grades: Array.from(new Set(data.map(d => d.grade))).sort(),
      lots: Array.from(new Set(data.map(d => d.lot))).sort(),
      ratings: Array.from(new Set(data.map(d => d.rating.toString()))).sort((a, b) => Number(a) - Number(b))
    };
  }, [data]);

  // Data for Box/Scatter Plot
  const chartData = useMemo(() => {
    // Group by Grade and Lot
    const grouped: Record<string, { rating: number, tester: string }[]> = {};
    const details: Record<string, { grade: string, lot: string }> = {};

    filteredData.forEach(d => {
      const key = `${d.grade}-${d.lot}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ rating: d.rating, tester: d.tester });
      details[key] = { grade: d.grade, lot: d.lot };
    });

    return Object.keys(grouped).map(key => {
      const values = grouped[key];
      const ratings = values.map(v => v.rating);
      const stats = calculateQuartiles(ratings);
      const mean = calculateMean(ratings);
      const mode = calculateMode(ratings);
      return {
        key,
        lot: details[key].lot,
        grade: details[key].grade,
        values, // for scatter (now includes tester)
        ...stats, // min, q1, median, q3, max
        mean,
        mode
      };
    });
  }, [filteredData]);

  if (loading) return <div className="h-64 flex items-center justify-center text-gray-400">Loading Analytics...</div>;

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 gap-6">
        {/* 3. Advanced Chart (Roughness) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Process Control Analysis</h3>
          <p className="text-sm text-gray-500 mb-6">Distribution of roughness scores by Lot Number.</p>
          
          <div className="w-full overflow-x-auto">
            <div className="min-w-[800px] h-[450px]">
               {chartData.length > 0 ? (
                 <BoxScatterChart 
                   data={chartData} 
                   type={chartType} 
                   aggType={aggType}
                   showGradeLabel={tableFilters.grade === ''}
                 />
               ) : (
                 <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-2">
                   <Settings2 className="w-8 h-8 text-gray-300" />
                   <span>No data matches the selected filters.</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex bg-[#f1f3f4] p-1 rounded self-start xl:self-auto">
          <button 
            onClick={() => setChartType('scatter')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 ${chartType === 'scatter' ? 'bg-white shadow-sm text-[#4285F4]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ScatterChart className="w-4 h-4" /> Scatter
          </button>
          <button 
            onClick={() => setChartType('box')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 ${chartType === 'box' ? 'bg-white shadow-sm text-[#4285F4]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BarChart2 className="w-4 h-4" /> Box Plot
          </button>
          <button 
            onClick={() => setChartType('combined')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 ${chartType === 'combined' ? 'bg-white shadow-sm text-[#4285F4]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Settings2 className="w-4 h-4" /> Combined
          </button>
        </div>
      </div>

      {/* 1.1 Aggregation Selection */}
      <div className="flex justify-end">
        <div className="flex bg-[#f1f3f4] p-1 rounded">
          <button 
            onClick={() => setAggType('mean')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${aggType === 'mean' ? 'bg-white shadow-sm text-[#4285F4]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Mean
          </button>
          <button 
            onClick={() => setAggType('median')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${aggType === 'median' ? 'bg-white shadow-sm text-[#4285F4]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Middle (Median)
          </button>
          <button 
            onClick={() => setAggType('mode')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${aggType === 'mode' ? 'bg-white shadow-sm text-[#4285F4]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Most (Mode)
          </button>
        </div>
      </div>

      {/* 2. Summary Statistics Cards - Google Colors */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <StatCard label="Total Inspections" value={overallStats.count} color="blue" />
         <StatCard label="Average (Mean)" value={overallStats.mean.toFixed(2)} color="green" subtext="Arithmetic Average" />
         <StatCard label="Median Score" value={overallStats.median.toFixed(2)} color="yellow" subtext="Middle Value" />
         <StatCard label="Mode Score" value={overallStats.mode} color="red" subtext="Most Frequent" />
      </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-lg font-medium text-gray-800">Inspection Raw Data</h3>
                <p className="text-sm text-gray-500">Detailed list of inspections matching current filters.</p>
              </div>
              {Object.values(tableFilters).some(v => v !== '') && (
                <button 
                  onClick={() => setTableFilters({ date: '', tester: '', grade: '', lot: '', rating: '' })}
                  className="text-xs text-[#EA4335] hover:text-[#c5221f] underline"
                >
                  Clear All Filters
                </button>
              )}
            </div>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
              {filteredData.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex flex-col gap-2">
                      <span>Date</span>
                      <select 
                        className="font-normal text-[10px] p-1 border border-gray-200 rounded w-full focus:outline-none focus:border-[#4285F4] bg-white"
                        value={tableFilters.date}
                        onChange={(e) => setTableFilters(prev => ({ ...prev, date: e.target.value }))}
                      >
                        <option value="">All</option>
                        {uniqueTableValues.dates.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex flex-col gap-2">
                      <span>Tester</span>
                      <select 
                        className="font-normal text-[10px] p-1 border border-gray-200 rounded w-full focus:outline-none focus:border-[#4285F4] bg-white"
                        value={tableFilters.tester}
                        onChange={(e) => setTableFilters(prev => ({ ...prev, tester: e.target.value }))}
                      >
                        <option value="">All</option>
                        {uniqueTableValues.testers.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex flex-col gap-2">
                      <span>Grade</span>
                      <select 
                        className="font-normal text-[10px] p-1 border border-gray-200 rounded w-full focus:outline-none focus:border-[#4285F4] bg-white"
                        value={tableFilters.grade}
                        onChange={(e) => setTableFilters(prev => ({ ...prev, grade: e.target.value }))}
                      >
                        <option value="">All</option>
                        {uniqueTableValues.grades.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex flex-col gap-2">
                      <span>Lot Number</span>
                      <select 
                        className="font-normal text-[10px] p-1 border border-gray-200 rounded w-full focus:outline-none focus:border-[#4285F4] bg-white"
                        value={tableFilters.lot}
                        onChange={(e) => setTableFilters(prev => ({ ...prev, lot: e.target.value }))}
                      >
                        <option value="">All</option>
                        {uniqueTableValues.lots.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">
                    <div className="flex flex-col gap-2">
                      <span>Rating</span>
                      <select 
                        className="font-normal text-[10px] p-1 border border-gray-200 rounded w-full focus:outline-none focus:border-[#4285F4] bg-white"
                        value={tableFilters.rating}
                        onChange={(e) => setTableFilters(prev => ({ ...prev, rating: e.target.value }))}
                      >
                        <option value="">All</option>
                        {uniqueTableValues.ratings.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{item.date} {item.time}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{item.tester}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.grade}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">{item.lot}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white
                        ${item.rating <= 2 ? 'bg-[#34A853]' : item.rating === 3 ? 'bg-[#FBBC05]' : 'bg-[#EA4335]'}
                      `}>
                        {item.rating}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400 italic">
                      No data available for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

    </div>
  );
};

// --- Sub-components ---

const StatCard = ({ label, value, color, subtext }: { label: string, value: string | number, color: string, subtext?: string }) => {
  const colors: Record<string, string> = {
    // Google Blue
    blue: 'bg-[#e8f0fe] text-[#1967d2] border-[#d2e3fc]',
    // Google Green
    green: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]',
    // Google Yellow
    yellow: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]',
    // Google Red
    red: 'bg-[#fce8e6] text-[#c5221f] border-[#f9d7d4]',
  };

  return (
    <div className={`p-5 rounded-lg border ${colors[color]} transition-all hover:shadow-sm`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <h3 className="text-3xl font-bold mt-1">{value}</h3>
      {subtext && <p className="text-xs mt-2 opacity-60">{subtext}</p>}
    </div>
  );
};

// --- SVG Chart Component (Box/Scatter) ---
interface ChartDataPoint {
  lot: string;
  grade: string;
  values: { rating: number, tester: string }[];
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  mode: number;
}

const BoxScatterChart = ({ data, type, aggType, showGradeLabel }: { 
  data: ChartDataPoint[], 
  type: ChartType, 
  aggType: AggregationType,
  showGradeLabel: boolean
}) => {
  const chartHeight = 400;
  const padding = { top: 20, right: 30, bottom: 120, left: 50 };
  const graphWidth = Math.max(800, data.length * 80); // Dynamic width
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Scale Y: Map 1-5 to pixel height
  const scaleY = (val: number) => graphHeight - ((val - 0.5) / 5) * graphHeight;

  return (
    <svg width="100%" height={chartHeight} viewBox={`0 0 ${graphWidth + padding.left + padding.right} ${chartHeight}`} className="overflow-visible">
      <g transform={`translate(${padding.left}, ${padding.top})`}>
        
        {/* Grid Lines Y */}
        {[1, 2, 3, 4, 5].map(tick => (
          <g key={tick}>
            <line x1={0} y1={scaleY(tick)} x2={graphWidth} y2={scaleY(tick)} stroke="#e5e7eb" strokeDasharray="3 3" />
            <text x={-10} y={scaleY(tick)} dy="0.32em" textAnchor="end" fontSize="12" fill="#5f6368">{tick}</text>
          </g>
        ))}

        {/* X Axis Line */}
        <line x1={0} y1={graphHeight} x2={graphWidth} y2={graphHeight} stroke="#dadce0" />

        {/* Data Loop */}
        {data.map((item, index) => {
          const xCenter = (index + 0.5) * (graphWidth / data.length);
          const boxWidth = (graphWidth / data.length) * 0.4;
          
          const aggValue = aggType === 'mean' ? item.mean : aggType === 'median' ? item.median : item.mode;

          return (
            <g key={`${item.grade}-${item.lot}`}>
              
              {/* Box Plot Layer */}
              {(type === 'box' || type === 'combined') && (
                <g>
                   {/* Whiskers (Min to Max) */}
                   <line x1={xCenter} y1={scaleY(item.min)} x2={xCenter} y2={scaleY(item.max)} stroke="#3c4043" strokeWidth="2" />
                   <line x1={xCenter - boxWidth/2} y1={scaleY(item.min)} x2={xCenter + boxWidth/2} y2={scaleY(item.min)} stroke="#3c4043" strokeWidth="2" />
                   <line x1={xCenter - boxWidth/2} y1={scaleY(item.max)} x2={xCenter + boxWidth/2} y2={scaleY(item.max)} stroke="#3c4043" strokeWidth="2" />
                   
                   {/* Box (Q1 to Q3) */}
                   <rect 
                     x={xCenter - boxWidth/2} 
                     y={Math.min(scaleY(item.q1), scaleY(item.q3))} 
                     width={boxWidth} 
                     height={Math.max(Math.abs(scaleY(item.q3) - scaleY(item.q1)), 2)} 
                     fill="#bdc1c6" 
                     fillOpacity="0.5" 
                     stroke="#3c4043" 
                     strokeWidth="2" 
                   />

                   {/* Median Line */}
                   <line 
                     x1={xCenter - boxWidth/2} 
                     y1={scaleY(item.median)} 
                     x2={xCenter + boxWidth/2} 
                     y2={scaleY(item.median)} 
                     stroke="#fff" 
                     strokeWidth="2" 
                   />
                </g>
              )}

              {/* Jitter Scatter Layer */}
              {(type === 'scatter' || type === 'combined') && (
                <g>
                  {item.values.map((val, i) => {
                    // Psuedo-random jitter based on value and index
                    const jitter = (Math.sin(i * 999) * boxWidth * 0.4); 
                    return (
                      <circle 
                        key={i} 
                        cx={xCenter + jitter} 
                        cy={scaleY(val.rating)} 
                        r={4} 
                        fill="#9aa0a6" // Grey color
                        fillOpacity="0.8"
                        stroke="white"
                        strokeWidth="1"
                        className="cursor-help"
                      >
                        <title>Tester: {val.tester}</title>
                      </circle>
                    );
                  })}
                </g>
              )}

              {/* Aggregation Marker (Triangle) */}
              {(() => {
                const markerColor = aggType === 'mean' ? '#137333' : aggType === 'median' ? '#b06000' : '#c5221f';
                return (
                  <g>
                    <path 
                      d={`M ${xCenter} ${scaleY(aggValue) - 8} L ${xCenter + 6} ${scaleY(aggValue) + 4} L ${xCenter - 6} ${scaleY(aggValue) + 4} Z`}
                      fill={markerColor}
                      stroke="white"
                      strokeWidth="1"
                    />
                    <text x={xCenter} y={scaleY(aggValue) - 12} textAnchor="middle" fontSize="10" fill={markerColor} fontWeight="bold">
                      {aggValue.toFixed(2)}
                    </text>
                  </g>
                );
              })()}

              {/* X Axis Labels */}
              <text 
                x={0} 
                y={0} 
                transform={`translate(${xCenter}, ${graphHeight + 15}) rotate(-90)`} 
                textAnchor="end" 
                fontSize="11" 
                fill="#3c4043"
                fontWeight="500"
              >
                {showGradeLabel ? `${item.grade} - ${item.lot}` : item.lot}
              </text>

            </g>
          );
        })}
      </g>
    </svg>
  );
};
