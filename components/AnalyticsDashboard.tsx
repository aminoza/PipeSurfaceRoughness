import React, { useEffect, useState, useMemo } from 'react';
import { db, collection, query, orderBy, onSnapshot } from '../firebase';
import { InspectionData } from '../types';
import { BarChart2, ScatterChart, Settings2, ChevronDown, Check, Grid3X3 } from 'lucide-react';

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
  const [chartType, setChartType] = useState<ChartType>('scatter');
  const [aggType, setAggType] = useState<AggregationType>('mode');
  const [heatmapAggType, setHeatmapAggType] = useState<AggregationType>('mode');

  // Unified filters (from table columns)
  const [tableFilters, setTableFilters] = useState({
    date: '',
    tester: '',
    grade: [] as string[],
    lot: '',
    rating: ''
  });

  useEffect(() => {
    const q = query(collection(db, "inspections"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawData = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          lot: (d.lot || '').toString().toUpperCase().trim()
        } as InspectionData;
      });
      setData(rawData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Derived Data ---
  const filteredData = useMemo(() => {
    return data
      .filter(item => {
        const dateStr = `${item.date} ${item.time}`;
        const dateMatch = tableFilters.date === '' || dateStr === tableFilters.date;
        const testerMatch = tableFilters.tester === '' || item.tester === tableFilters.tester;
        const gradeMatch = tableFilters.grade.length === 0 || tableFilters.grade.includes(item.grade);
        const lotMatch = tableFilters.lot === '' || item.lot === tableFilters.lot;
        const ratingMatch = tableFilters.rating === '' || item.rating.toString() === tableFilters.rating;
        
        return dateMatch && testerMatch && gradeMatch && lotMatch && ratingMatch;
      })
      .sort((a, b) => {
        // Primary Sort: Grade
        const gradeCompare = a.grade.localeCompare(b.grade);
        if (gradeCompare !== 0) return gradeCompare;

        // Secondary Sort: Production Line (Extracted from Lot)
        const getLine = (lot: string) => {
          if (!lot || lot.length < 2) return lot || 'Unknown';
          const match = lot.substring(1).match(/^[A-Za-z]+/);
          return match ? match[0].toUpperCase() : lot.charAt(1).toUpperCase();
        };
        const lineA = getLine(a.lot);
        const lineB = getLine(b.lot);
        const lineCompare = lineA.localeCompare(lineB);
        if (lineCompare !== 0) return lineCompare;

        // Tertiary Sort: Lot Number
        const lotCompare = a.lot.localeCompare(b.lot);
        if (lotCompare !== 0) return lotCompare;
        
        // Final Sort: Tester
        return a.tester.localeCompare(b.tester);
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
    const getFilteredOptions = (excludeKey: keyof typeof tableFilters) => {
      return data.filter(item => {
        const dateStr = `${item.date} ${item.time}`;
        const dateMatch = excludeKey === 'date' || tableFilters.date === '' || dateStr === tableFilters.date;
        const testerMatch = excludeKey === 'tester' || tableFilters.tester === '' || item.tester === tableFilters.tester;
        const gradeMatch = excludeKey === 'grade' || tableFilters.grade.length === 0 || tableFilters.grade.includes(item.grade);
        const lotMatch = excludeKey === 'lot' || tableFilters.lot === '' || item.lot === tableFilters.lot;
        const ratingMatch = excludeKey === 'rating' || tableFilters.rating === '' || item.rating.toString() === tableFilters.rating;
        
        return dateMatch && testerMatch && gradeMatch && lotMatch && ratingMatch;
      });
    };

    return {
      dates: Array.from(new Set(getFilteredOptions('date').map(d => `${d.date} ${d.time}`))).sort(),
      testers: Array.from(new Set(getFilteredOptions('tester').map(d => d.tester))).sort(),
      grades: Array.from(new Set(getFilteredOptions('grade').map(d => d.grade))).sort(),
      lots: Array.from(new Set(getFilteredOptions('lot').map(d => d.lot))).sort(),
      ratings: Array.from(new Set(getFilteredOptions('rating').map(d => d.rating.toString()))).sort((a, b) => Number(a) - Number(b))
    };
  }, [data, tableFilters]);

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

    return Object.keys(grouped)
      .sort((a, b) => {
        const detA = details[a];
        const detB = details[b];
        // Sort by Grade first
        const gradeCompare = detA.grade.localeCompare(detB.grade);
        if (gradeCompare !== 0) return gradeCompare;

        // Then by Production Line
        const getLine = (lot: string) => {
          if (!lot || lot.length < 2) return lot || 'Unknown';
          const match = lot.substring(1).match(/^[A-Za-z]+/);
          return match ? match[0].toUpperCase() : lot.charAt(1).toUpperCase();
        };
        const lineA = getLine(detA.lot);
        const lineB = getLine(detB.lot);
        const lineCompare = lineA.localeCompare(lineB);
        if (lineCompare !== 0) return lineCompare;

        // Then by Lot Number
        return detA.lot.localeCompare(detB.lot);
      })
      .map(key => {
        const values = grouped[key];
        const ratings = values.map(v => v.rating);
        const stats = calculateQuartiles(ratings);
        const mean = calculateMean(ratings);
        const mode = calculateMode(ratings);
        return {
          key,
          lot: details[key].lot,
          grade: details[key].grade,
          values, // for scatter
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

        {/* 1.1 Aggregation Selection moved here */}
        <div className="flex bg-[#f1f3f4] p-1 rounded self-end xl:self-auto">
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
              {Object.values(tableFilters).some(v => Array.isArray(v) ? v.length > 0 : v !== '') && (
                <button 
                  onClick={() => setTableFilters({ date: '', tester: '', grade: [], lot: '', rating: '' })}
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
                      <span>Grade</span>
                      <MultiSelect 
                        options={uniqueTableValues.grades}
                        selected={tableFilters.grade}
                        onChange={(val) => setTableFilters(prev => ({ ...prev, grade: val }))}
                        placeholder="All"
                      />
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">{item.grade}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">{item.lot}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white
                        ${item.rating <= 2 ? 'bg-[#34A853]' : item.rating === 3 ? 'bg-[#FBBC05]' : 'bg-[#EA4335]'}
                      `}>
                        {item.rating}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{item.tester}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{item.date} {item.time}</td>
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

        {/* 0. Matrix Heatmap (Overview) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-[#4285F4]" />
              <h3 className="text-lg font-medium text-gray-800">Matrix Heatmap (Global Overview)</h3>
            </div>
            
            {/* Heatmap Aggregation Selector */}
            <div className="flex bg-gray-100 p-1 rounded-lg self-start">
              {(['mean', 'median', 'mode'] as AggregationType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setHeatmapAggType(type)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    heatmapAggType === type
                      ? 'bg-white text-[#4285F4] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {type === 'mean' ? 'Mean' : type === 'median' ? 'Middle (Median)' : 'Most (Mode)'}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">Quick overview of all data patterns by Grade and Production Line. (Unaffected by table filters)</p>
          <MatrixHeatmap data={data} aggType={heatmapAggType} />
        </div>

    </div>
  );
};

// --- Sub-components ---

const MatrixHeatmap = ({ data, aggType }: { data: InspectionData[], aggType: AggregationType }) => {
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);

  const heatmapData = useMemo(() => {
    const getLine = (lot: string) => {
      if (!lot || lot.length < 2) return lot || 'Unknown';
      // Match all alphabetic characters starting from index 1
      const match = lot.substring(1).match(/^[A-Za-z]+/);
      return match ? match[0].toUpperCase() : lot.charAt(1).toUpperCase();
    };

    const allGrades = Array.from(new Set(data.map(d => d.grade))).sort();
    const allLines = Array.from(new Set(data.map(d => getLine(d.lot)))).sort();

    const filteredData = data.filter(d => {
      const line = getLine(d.lot);
      const matchGrade = selectedGrades.length === 0 || selectedGrades.includes(d.grade);
      const matchLine = selectedLines.length === 0 || selectedLines.includes(line);
      return matchGrade && matchLine;
    });

    const grades = Array.from(new Set(filteredData.map(d => d.grade))).sort();
    const lines = Array.from(new Set(filteredData.map(d => getLine(d.lot)))).sort();
    
    const matrix: Record<string, Record<string, InspectionData[]>> = {};
    
    filteredData.forEach(d => {
      const line = getLine(d.lot);
      if (!matrix[line]) matrix[line] = {};
      if (!matrix[line][d.grade]) matrix[line][d.grade] = [];
      matrix[line][d.grade].push(d);
    });

    return { allGrades, allLines, grades, lines, matrix };
  }, [data, selectedGrades, selectedLines]);

  const calculateStats = (items: InspectionData[]) => {
    if (!items || items.length === 0) return null;
    
    const values = items.map(i => i.rating);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    let aggValue: number | string = 0;
    let colorValue = 0;
    
    if (aggType === 'mean') {
      aggValue = values.reduce((a, b) => a + b, 0) / values.length;
      colorValue = aggValue;
    } else if (aggType === 'median') {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      aggValue = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      colorValue = aggValue;
    } else if (aggType === 'mode') {
      // Group by lot to find modes of each lot
      const lotGroups: Record<string, number[]> = {};
      items.forEach(item => {
        if (!lotGroups[item.lot]) lotGroups[item.lot] = [];
        lotGroups[item.lot].push(item.rating);
      });

      const findMode = (vals: number[]) => {
        const counts: Record<number, number> = {};
        vals.forEach(v => counts[v] = (counts[v] || 0) + 1);
        let maxCount = 0;
        let mode = vals[0];
        for (const val in counts) {
          if (counts[val] > maxCount) {
            maxCount = counts[val];
            mode = Number(val);
          }
        }
        return mode;
      };

      const lotModes = Object.values(lotGroups).map(findMode);
      const minMode = Math.min(...lotModes);
      const maxMode = Math.max(...lotModes);

      if (minMode === maxMode) {
        aggValue = minMode;
        colorValue = minMode;
      } else {
        aggValue = `${minMode} - ${maxMode}`;
        colorValue = (minMode + maxMode) / 2;
      }
    }
    
    return { aggValue, min, max, colorValue };
  };

  const getColorClass = (value: number) => {
    // Rating is 1-5
    // 1-2: Green (Good)
    // 3: Yellow (Warning)
    // 4-5: Red (Bad)
    if (value <= 2) return 'bg-[#34A853] text-white'; // Green
    if (value <= 3) return 'bg-[#FBBC05] text-white'; // Yellow
    return 'bg-[#EA4335] text-white'; // Red
  };

  if (heatmapData.allGrades.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Grade:</span>
          <div className="w-40">
            <MultiSelect 
              options={heatmapData.allGrades} 
              selected={selectedGrades} 
              onChange={setSelectedGrades} 
              placeholder="All Grades" 
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Line:</span>
          <div className="w-40">
            <MultiSelect 
              options={heatmapData.allLines} 
              selected={selectedLines} 
              onChange={setSelectedLines} 
              placeholder="All Lines" 
            />
          </div>
        </div>
        {(selectedGrades.length > 0 || selectedLines.length > 0) && (
          <button 
            onClick={() => { setSelectedGrades([]); setSelectedLines([]); }}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        {heatmapData.grades.length === 0 || heatmapData.lines.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-400">
            No data matches the selected filters.
          </div>
        ) : (
          <table className="w-full border-separate border-spacing-2">
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                <th className="w-32 bg-white text-right pr-4 text-xs font-semibold text-gray-400 uppercase">Line</th>
                {heatmapData.grades.map(grade => (
                  <th key={grade} className="px-4 py-2 text-sm font-medium text-gray-500 text-center bg-white">
                    {grade}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.lines.map(line => (
                <tr key={line}>
                  <td className="pr-4 py-2 text-sm font-bold text-gray-700 text-right">
                    Line {line}
                  </td>
                  {heatmapData.grades.map(grade => {
                    const values = heatmapData.matrix[line]?.[grade];
                    const stats = calculateStats(values);
                    
                    return (
                      <td key={grade} className="p-0">
                        <div className={`
                          h-16 rounded-lg flex flex-col items-center justify-center transition-all
                          ${stats !== null ? getColorClass(stats.colorValue) : 'bg-gray-50 text-gray-300'}
                          shadow-sm hover:scale-[1.02] cursor-default
                        `}>
                          {stats !== null ? (
                            <div className="text-xl font-bold">
                              {typeof stats.aggValue === 'number' && aggType === 'mean' ? stats.aggValue.toFixed(1) : stats.aggValue}
                            </div>
                          ) : '-'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const MultiSelect = ({ options, selected, onChange, placeholder }: { 
  options: string[], 
  selected: string[], 
  onChange: (val: string[]) => void,
  placeholder: string
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(o => o !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between font-normal text-[10px] p-1 border border-gray-200 rounded w-full focus:outline-none focus:border-[#4285F4] bg-white h-[26px]"
      >
        <span className="truncate max-w-[80px]">
          {selected.length === 0 ? placeholder : selected.join(', ')}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute left-0 mt-1 w-full min-w-[120px] bg-white border border-gray-200 rounded shadow-lg z-20 max-h-48 overflow-y-auto">
            <div className="p-1">
              <button 
                onClick={() => { onChange([]); setIsOpen(false); }}
                className="flex items-center w-full px-2 py-1.5 text-[10px] text-gray-500 hover:bg-gray-50 rounded"
              >
                Clear All
              </button>
              <div className="h-px bg-gray-100 my-1"></div>
              {options.map(option => (
                <button 
                  key={option}
                  onClick={() => toggleOption(option)}
                  className="flex items-center justify-between w-full px-2 py-1.5 text-[10px] text-gray-700 hover:bg-gray-50 rounded"
                >
                  <span className="truncate">{option}</span>
                  {selected.includes(option) && <Check className="w-3 h-3 text-[#4285F4]" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

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
  key: string;
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

const BoxScatterChart = ({ data, type, aggType }: { 
  data: ChartDataPoint[], 
  type: ChartType, 
  aggType: AggregationType
}) => {
  const chartHeight = 480;
  const padding = { top: 20, right: 30, bottom: 120, left: 50 };
  const graphWidth = Math.max(800, data.length * 80); // Dynamic width
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Scale Y: Map 1-5 to pixel height
  const scaleY = (val: number) => graphHeight - ((val - 0.5) / 5) * graphHeight;

  // Group data by grade for hierarchical axis
  const gradeGroups = useMemo(() => {
    const groups: { grade: string, startIndex: number, count: number }[] = [];
    data.forEach((item, index) => {
      if (groups.length === 0 || groups[groups.length - 1].grade !== item.grade) {
        groups.push({ grade: item.grade, startIndex: index, count: 1 });
      } else {
        groups[groups.length - 1].count++;
      }
    });
    return groups;
  }, [data]);

  const barWidth = graphWidth / data.length;

  return (
    <svg width="100%" height={chartHeight} viewBox={`0 0 ${graphWidth + padding.left + padding.right} ${chartHeight}`} className="overflow-visible">
      <g transform={`translate(${padding.left}, ${padding.top})`}>
        
        {/* Grid Lines Y */}
        {[1, 2, 3, 4, 5].map(tick => (
          <g key={tick}>
            <line x1={0} y1={scaleY(tick)} x2={graphWidth} y2={scaleY(tick)} stroke="#d1d5db" strokeDasharray="3 3" />
            <text x={-10} y={scaleY(tick)} dy="0.32em" textAnchor="end" fontSize="14" fill="#5f6368">{tick}</text>
          </g>
        ))}

        {/* X Axis Line */}
        <line x1={0} y1={graphHeight} x2={graphWidth} y2={graphHeight} stroke="#dadce0" />

        {/* Data Loop */}
        {data.map((item, index) => {
          const xCenter = (index + 0.5) * barWidth;
          const boxWidth = barWidth * 0.4;
          
          const getLine = (lot: string) => {
            if (!lot || lot.length < 2) return lot || 'Unknown';
            const match = lot.substring(1).match(/^[A-Za-z]+/);
            return match ? match[0].toUpperCase() : lot.charAt(1).toUpperCase();
          };

          const currentLine = getLine(item.lot);
          const prevLine = index > 0 ? getLine(data[index - 1].lot) : null;
          const isNewLine = index > 0 && currentLine !== prevLine && item.grade === data[index - 1].grade;

          const aggValue = aggType === 'mean' ? item.mean : aggType === 'median' ? item.median : item.mode;

          return (
            <g key={item.key}>
              {/* Line Separator (Dashed) */}
              {isNewLine && (
                <line 
                  x1={index * barWidth} 
                  y1={0} 
                  x2={index * barWidth} 
                  y2={graphHeight + 45} 
                  stroke="#9ca3af" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                />
              )}
              
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
                        r={6} 
                        fill="#9aa0a6" // Grey color
                        fillOpacity="0.8"
                        stroke="white"
                        strokeWidth="1.5"
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
                      d={`M ${xCenter} ${scaleY(aggValue) - 12} L ${xCenter + 9} ${scaleY(aggValue) + 6} L ${xCenter - 9} ${scaleY(aggValue) + 6} Z`}
                      fill={markerColor}
                      stroke="white"
                      strokeWidth="1.5"
                    />
                    <text x={xCenter} y={scaleY(aggValue) - 16} textAnchor="middle" fontSize="14" fill={markerColor} fontWeight="bold">
                      {aggValue.toFixed(2)}
                    </text>
                  </g>
                );
              })()}

              {/* Lot Label (Horizontal) */}
              <text 
                x={xCenter} 
                y={graphHeight + 30} 
                textAnchor="middle" 
                fontSize="14" 
                fill="#5f6368"
                fontWeight="500"
              >
                {item.lot}
              </text>

            </g>
          );
        })}

        {/* Hierarchical Axis Bottom Layer */}
        <g transform={`translate(0, ${graphHeight + 45})`}>
          <line x1={0} y1={0} x2={graphWidth} y2={0} stroke="#dadce0" />
          
          {gradeGroups.map((group, idx) => {
            const groupStartX = group.startIndex * barWidth;
            const groupCenterX = groupStartX + (group.count * barWidth) / 2;

            return (
              <g key={group.grade}>
                {/* Vertical Separator */}
                {idx > 0 && (
                  <line x1={groupStartX} y1={-45} x2={groupStartX} y2={40} stroke="#dadce0" strokeWidth="1" />
                )}
                {/* Grade Label */}
                <text 
                  x={groupCenterX} 
                  y={35} 
                  textAnchor="middle" 
                  fontSize="15" 
                  fontWeight="bold" 
                  fill="#3c4043"
                >
                  {group.grade}
                </text>
              </g>
            );
          })}
          {/* Final vertical line */}
          <line x1={graphWidth} y1={-45} x2={graphWidth} y2={40} stroke="#dadce0" strokeWidth="1" />
        </g>

      </g>
    </svg>
  );
};
