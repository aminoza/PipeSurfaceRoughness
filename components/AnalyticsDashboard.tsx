import React, { useEffect, useState, useMemo, useRef } from 'react';
import { db, collection, query, orderBy, onSnapshot } from '../firebase';
import { InspectionData } from '../types';
import { Filter, BarChart2, ScatterChart, Settings2, ChevronDown, Check } from 'lucide-react';

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

// --- MultiSelect Component ---
interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const selectAll = () => onChange([]); // Empty array means "All" in our logic
  const clearAll = () => onChange([]); // Reset to default (All)

  const isAllSelected = selected.length === 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full md:w-56 px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-[#4285F4] outline-none"
      >
        <span className="truncate">
          {isAllSelected 
            ? `All ${label}s` 
            : `${selected.length} ${label}${selected.length > 1 ? 's' : ''} Selected`}
        </span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-64 mt-2 bg-white border border-gray-200 rounded shadow-xl max-h-80 overflow-y-auto animate-fade-in-up">
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10 flex justify-between">
            <button 
              onClick={selectAll}
              className="text-xs font-semibold text-[#1967d2] hover:bg-[#e8f0fe] px-2 py-1 rounded"
            >
              Select All
            </button>
            {!isAllSelected && (
              <button 
                onClick={clearAll}
                className="text-xs font-semibold text-gray-500 hover:bg-gray-100 px-2 py-1 rounded"
              >
                Reset
              </button>
            )}
          </div>
          <div className="p-2 space-y-1">
            {options.map(option => {
              const isSelected = selected.includes(option);
              return (
                <div 
                  key={option} 
                  onClick={() => toggleOption(option)}
                  className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors text-sm
                    ${isSelected ? 'bg-[#e8f0fe] text-[#1967d2]' : 'hover:bg-gray-50 text-gray-700'}
                  `}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                    ${isSelected ? 'bg-[#4285F4] border-[#4285F4]' : 'border-gray-300 bg-white'}
                  `}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="truncate">{option}</span>
                </div>
              );
            })}
            {options.length === 0 && <div className="text-center text-gray-400 py-2 text-xs">No options available</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<InspectionData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Controls (Arrays for multi-select)
  const [selectedTesters, setSelectedTesters] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>('combined');

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
  const uniqueTesters = useMemo(() => Array.from(new Set(data.map(d => d.tester))).sort(), [data]);
  const uniqueGrades = useMemo(() => Array.from(new Set(data.map(d => d.grade))).sort(), [data]);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      // Empty array means "All Selected"
      const matchTester = selectedTesters.length === 0 || selectedTesters.includes(d.tester);
      const matchGrade = selectedGrades.length === 0 || selectedGrades.includes(d.grade);
      return matchTester && matchGrade;
    });
  }, [data, selectedTesters, selectedGrades]);

  const overallStats = useMemo(() => {
    const ratings = filteredData.map(d => d.rating);
    return {
      mean: calculateMean(ratings),
      median: calculateMedian(ratings),
      mode: calculateMode(ratings),
      count: ratings.length
    };
  }, [filteredData]);

  // Data for Box/Scatter Plot
  const chartData = useMemo(() => {
    // Group by Lot
    const groupedByLot: Record<string, number[]> = {};
    const lotDetails: Record<string, { grade: string }> = {};

    filteredData.forEach(d => {
      if (!groupedByLot[d.lot]) groupedByLot[d.lot] = [];
      groupedByLot[d.lot].push(d.rating);
      lotDetails[d.lot] = { grade: d.grade };
    });

    return Object.keys(groupedByLot).map(lot => {
      const values = groupedByLot[lot];
      const stats = calculateQuartiles(values);
      const mean = calculateMean(values);
      return {
        lot,
        values, // for scatter
        ...stats, // min, q1, median, q3, max
        mean,
        grade: lotDetails[lot].grade
      };
    });
  }, [filteredData]);

  if (loading) return <div className="h-64 flex items-center justify-center text-gray-400">Loading Analytics...</div>;

  return (
    <div className="space-y-6">
      
      {/* 1. Controls Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-3">
           {/* Multi Select for Grade */}
           <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 hidden md:block" />
              <MultiSelect 
                label="Grade" 
                options={uniqueGrades} 
                selected={selectedGrades} 
                onChange={setSelectedGrades} 
              />
           </div>

           {/* Multi Select for Tester */}
           <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 hidden md:block" />
              <MultiSelect 
                label="Tester" 
                options={uniqueTesters} 
                selected={selectedTesters} 
                onChange={setSelectedTesters} 
              />
           </div>
           
           {/* Active Filters Summary (Mobile mostly) */}
           {(selectedGrades.length > 0 || selectedTesters.length > 0) && (
              <button 
                onClick={() => { setSelectedGrades([]); setSelectedTesters([]); }}
                className="text-xs text-[#EA4335] hover:text-[#c5221f] underline self-start md:self-center"
              >
                Clear Filters
              </button>
           )}
        </div>

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

      {/* 2. Summary Statistics Cards - Google Colors */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <StatCard label="Total Inspections" value={overallStats.count} color="blue" />
         <StatCard label="Average (Mean)" value={overallStats.mean.toFixed(2)} color="green" subtext="Arithmetic Average" />
         <StatCard label="Median Score" value={overallStats.median.toFixed(2)} color="yellow" subtext="Middle Value" />
         <StatCard label="Mode Score" value={overallStats.mode} color="red" subtext="Most Frequent" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 3. Advanced Chart (Roughness) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Process Control Analysis</h3>
          <p className="text-sm text-gray-500 mb-6">Distribution of roughness scores by Lot Number.</p>
          
          <div className="w-full overflow-x-auto">
            <div className="min-w-[800px] h-[450px]">
               {chartData.length > 0 ? (
                 <BoxScatterChart data={chartData} type={chartType} />
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
  values: number[];
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
}

const BoxScatterChart = ({ data, type }: { data: ChartDataPoint[], type: ChartType }) => {
  const chartHeight = 400;
  const padding = { top: 20, right: 30, bottom: 80, left: 50 };
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
          
          return (
            <g key={item.lot}>
              
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
                        cy={scaleY(val)} 
                        r={4} 
                        fill={
                           val <= 2 ? '#34A853' :  // Google Green
                           val === 3 ? '#FBBC05' : // Google Yellow
                           '#EA4335'               // Google Red
                        }
                        fillOpacity="0.8"
                        stroke="white"
                        strokeWidth="1"
                      />
                    );
                  })}
                </g>
              )}

              {/* Mean Marker (Triangle) */}
              <path 
                d={`M ${xCenter} ${scaleY(item.mean) - 8} L ${xCenter + 6} ${scaleY(item.mean) + 4} L ${xCenter - 6} ${scaleY(item.mean) + 4} Z`}
                fill="#1967d2"
                stroke="white"
                strokeWidth="1"
              />
              <text x={xCenter} y={scaleY(item.mean) - 12} textAnchor="middle" fontSize="10" fill="#1967d2" fontWeight="bold">
                {item.mean.toFixed(2)}
              </text>

              {/* X Axis Labels */}
              <text 
                x={0} 
                y={0} 
                transform={`translate(${xCenter}, ${graphHeight + 15}) rotate(-90)`} 
                textAnchor="end" 
                fontSize="12" 
                fill="#3c4043"
                fontWeight="500"
              >
                {item.lot}
              </text>

            </g>
          );
        })}
      </g>
    </svg>
  );
};