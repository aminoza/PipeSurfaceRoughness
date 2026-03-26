import React, { useEffect, useState, useMemo, useRef } from 'react';
import { db, collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from '../firebase';
import { InspectionData } from '../types';
import { Trash2, Search, FileText, Download, Box, Edit, X, Save, Users, ChevronDown, Check, Filter } from 'lucide-react';

const TESTER_NAMES = [
  "Danai Paragum",
  "Jarun Thaijaroen",
  "Kriengsak Tarasri",
  "Piyapad Mulsawas",
  "Pradit Nutthanara",
  "Saikhim Panawes",
  "Thanon Kahadit",
  "Thunchanok Hongsakul"
];

// --- MultiSelect Component (Duplicated for independence) ---
interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full md:w-48 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-[#4285F4] focus:border-[#4285F4] outline-none"
      >
        <span className="truncate">
          {selected.length === 0 
            ? `All ${label}s` 
            : `${selected.length} ${label}${selected.length > 1 ? 's' : ''}`}
        </span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-56 mt-2 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-64 overflow-y-auto animate-fade-in">
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10 flex justify-between">
            <button 
              onClick={() => onChange([])} // Clear to select all effectively
              className="text-xs font-semibold text-[#4285F4] hover:bg-[#e8f0fe] px-2 py-1 rounded"
            >
              Reset
            </button>
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

// --- SVG Tester Coverage Chart ---
interface CoverageDataPoint {
  lot: string;
  grade: string;
  count: number;
  testers: string[];
}

const TesterCoverageChart = ({ data }: { data: CoverageDataPoint[] }) => {
  const chartHeight = 300;
  const padding = { top: 30, right: 30, bottom: 80, left: 50 };
  const graphWidth = Math.max(800, data.length * 80);
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const maxCount = Math.max(Math.max(...data.map(d => d.count)), 3);
  const scaleY = (val: number) => graphHeight - (val / maxCount) * graphHeight;

  return (
    <svg width="100%" height={chartHeight} viewBox={`0 0 ${graphWidth + padding.left + padding.right} ${chartHeight}`} className="overflow-visible">
       <g transform={`translate(${padding.left}, ${padding.top})`}>
          {Array.from({ length: maxCount + 1 }).map((_, i) => (
             <g key={i}>
            <line x1={0} y1={scaleY(i)} x2={graphWidth} y2={scaleY(i)} stroke="#d1d5db" strokeDasharray="3 3" />
            <text x={-10} y={scaleY(i)} dy="0.32em" textAnchor="end" fontSize="14" fill="#5f6368">{i}</text>
          </g>
          ))}
          <line x1={0} y1={graphHeight} x2={graphWidth} y2={graphHeight} stroke="#dadce0" />
          {data.map((item, index) => {
             const xCenter = (index + 0.5) * (graphWidth / data.length);
             const barWidth = (graphWidth / data.length) * 0.5;
             const barHeight = graphHeight - scaleY(item.count);

             return (
               <g key={item.lot} className="group">
                  <rect
                    x={xCenter - barWidth / 2}
                    y={scaleY(item.count)}
                    width={barWidth}
                    height={barHeight}
                    fill="#4285F4" 
                    rx="2"
                    className="transition-all duration-300 group-hover:fill-[#1967d2]"
                  />
                  <text 
                    x={xCenter} 
                    y={scaleY(item.count) - 6} 
                    textAnchor="middle" 
                    fontSize="14" 
                    fontWeight="bold" 
                    fill="#4285F4"
                  >
                    {item.count}
                  </text>
                  <text 
                    x={0} 
                    y={0} 
                    transform={`translate(${xCenter}, ${graphHeight + 15}) rotate(-90)`} 
                    textAnchor="end" 
                    fontSize="14" 
                    fill="#3c4043"
                    fontWeight="500"
                  >
                    {item.lot}
                  </text>
                  <text 
                    x={0} 
                    y={0} 
                    transform={`translate(${xCenter + 12}, ${graphHeight + 15}) rotate(-90)`} 
                    textAnchor="end" 
                    fontSize="10" 
                    fill="#5f6368"
                  >
                    {item.grade}
                  </text>
               </g>
             );
          })}
       </g>
    </svg>
  );
};

export const InspectionHistory: React.FC = () => {
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Coverage Chart Filters
  const [selectedCoverageGrades, setSelectedCoverageGrades] = useState<string[]>([]);
  const [selectedCoverageLots, setSelectedCoverageLots] = useState<string[]>([]);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<InspectionData | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "inspections"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          lot: (d.lot || '').toString().toUpperCase().trim()
        } as InspectionData;
      });
      setInspections(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- Logic for Coverage Chart ---
  const uniqueGrades = useMemo(() => Array.from(new Set(inspections.map(d => d.grade))).sort(), [inspections]);
  const uniqueLots = useMemo(() => Array.from(new Set(inspections.map(d => d.lot))).sort(), [inspections]);

  const coverageData = useMemo(() => {
    const filtered = inspections.filter(d => {
       const matchGrade = selectedCoverageGrades.length === 0 || selectedCoverageGrades.includes(d.grade);
       const matchLot = selectedCoverageLots.length === 0 || selectedCoverageLots.includes(d.lot);
       return matchGrade && matchLot;
    });

    const grouped: Record<string, Set<string>> = {};
    const lotGrades: Record<string, string> = {};

    filtered.forEach(d => {
      if (!grouped[d.lot]) grouped[d.lot] = new Set();
      grouped[d.lot].add(d.tester);
      lotGrades[d.lot] = d.grade;
    });

    return Object.keys(grouped).map(lot => ({
      lot,
      grade: lotGrades[lot],
      count: grouped[lot].size,
      testers: Array.from(grouped[lot])
    })).sort((a, b) => a.lot.localeCompare(b.lot));
  }, [inspections, selectedCoverageGrades, selectedCoverageLots]);

  // --- Logic for History Table ---
  const confirmDelete = (e: React.MouseEvent, id: string | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    if (id) {
      setDeleteId(id);
    }
  };

  const performDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "inspections", deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error("Error deleting document: ", err);
      alert("Failed to delete record.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (item: InspectionData) => {
    setCurrentEditItem({ ...item });
    setIsEditing(true);
  };

  const closeEditModal = () => {
    setIsEditing(false);
    setCurrentEditItem(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!currentEditItem) return;
    const { name, value } = e.target;
    setCurrentEditItem(prev => prev ? ({ ...prev, [name]: value }) : null);
  };

  const handleRatingChange = (rating: number) => {
    if (!currentEditItem) return;
    setCurrentEditItem(prev => prev ? ({ ...prev, rating }) : null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditItem?.id) return;

    setSavingEdit(true);
    try {
      const docRef = doc(db, "inspections", currentEditItem.id);
      const { id, ...dataToUpdate } = currentEditItem;
      await updateDoc(docRef, dataToUpdate as any);
      closeEditModal();
    } catch (err) {
      console.error("Error updating document: ", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const handleExport = () => {
    if (inspections.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ['Date', 'Time', 'Tester', 'Pipe Grade', 'Lot Number', 'Roughness Score (Ra)'];
    const rows = inspections.map(item => [
      item.date,
      item.time || formatTime(item.createdAt),
      `"${item.tester.replace(/"/g, '""')}"`,
      `"${item.grade.replace(/"/g, '""')}"`,
      `"${item.lot.replace(/"/g, '""')}"`,
      item.rating
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pipe_inspections_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInspections = inspections.filter(item => 
    item.tester.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.lot.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.grade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4285F4]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#4285F4]"/>
          <h2 className="text-2xl font-normal text-gray-800">History Log</h2>
      </div>

      {/* --- Tester Coverage Chart Section --- */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
             <div>
                <div className="flex items-center gap-2 mb-1">
                   <h3 className="text-lg font-medium text-gray-800">Tester Coverage Analysis</h3>
                   <span className="bg-[#e8f0fe] text-[#1967d2] text-xs px-2 py-0.5 rounded-full font-medium">By Grade & Lot</span>
                </div>
                <p className="text-sm text-gray-500">Number of unique testers who evaluated each Lot.</p>
             </div>
             
             {/* Chart Filters */}
             <div className="flex items-center gap-2 bg-[#f8f9fa] p-1.5 rounded border border-gray-100">
                <span className="text-xs font-semibold text-gray-400 px-2 uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filter:
                </span>
                <MultiSelect 
                  label="Grade" 
                  options={uniqueGrades} 
                  selected={selectedCoverageGrades} 
                  onChange={setSelectedCoverageGrades} 
                />
                <MultiSelect 
                  label="Lot" 
                  options={uniqueLots} 
                  selected={selectedCoverageLots} 
                  onChange={setSelectedCoverageLots} 
                />
                {(selectedCoverageGrades.length > 0 || selectedCoverageLots.length > 0) && (
                  <button 
                    onClick={() => { setSelectedCoverageGrades([]); setSelectedCoverageLots([]); }}
                    className="p-2 text-[#EA4335] hover:bg-[#fce8e6] rounded transition-colors"
                    title="Clear Filters"
                  >
                     <X className="w-4 h-4" />
                  </button>
                )}
             </div>
          </div>
          
          <div className="w-full overflow-x-auto">
             <div className="min-w-[800px] h-[300px]">
               {coverageData.length > 0 ? (
                 <TesterCoverageChart data={coverageData} />
               ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-2">
                   <Users className="w-8 h-8 text-gray-300" />
                   <span>No coverage data available for selected criteria.</span>
                 </div>
               )}
             </div>
          </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-3 pt-2">
        <div className="relative flex-grow md:flex-grow-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded border border-gray-300 focus:ring-2 focus:ring-[#4285F4] focus:border-[#4285F4] w-full md:w-80 outline-none bg-white shadow-sm"
            />
        </div>
        
        <button 
            onClick={handleExport}
            disabled={inspections.length === 0}
            className="flex items-center justify-center gap-2 bg-[#34A853] hover:bg-[#2d9147] disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded font-medium transition-all shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f8f9fa] text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">Time</th>
                <th className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">Tester</th>
                <th className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">Grade</th>
                <th className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">Lot Number</th>
                <th className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">Score</th>
                <th className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInspections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Box className="w-8 h-8 text-gray-300" />
                      <p>No records found matching your search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInspections.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f8f9fa] transition-colors group">
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-gray-700">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-gray-500 font-mono">
                      {item.time || formatTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-gray-900 font-medium">
                      {item.tester}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e8f0fe] text-[#1967d2] border border-[#d2e3fc]">
                        {item.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-gray-700 font-medium">
                      {item.lot}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${
                          item.rating <= 2 ? 'text-[#34A853]' : 
                          item.rating === 3 ? 'text-[#FBBC05]' : 'text-[#EA4335]'
                        }`}>
                          {item.rating}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${
                          item.rating <= 2 ? 'bg-[#34A853]' : 
                          item.rating === 3 ? 'bg-[#FBBC05]' : 'bg-[#EA4335]'
                        }`}></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-right">
                       <div className="flex justify-end gap-2">
                         <button 
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="text-gray-400 hover:text-[#4285F4] hover:bg-[#e8f0fe] p-2 rounded transition-colors z-10 relative cursor-pointer"
                          title="Edit Record"
                         >
                           <Edit className="w-4 h-4 pointer-events-none" />
                         </button>
                         <button 
                          type="button"
                          onClick={(e) => confirmDelete(e, item.id)}
                          className="text-gray-400 hover:text-[#EA4335] hover:bg-[#fce8e6] p-2 rounded transition-colors z-10 relative cursor-pointer"
                          title="Delete Record"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-[#f8f9fa] px-6 py-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
            <span>Showing {filteredInspections.length} records</span>
            {filteredInspections.length !== inspections.length && (
              <span>(Filtered from {inspections.length} total)</span>
            )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-[#fce8e6] rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-[#EA4335]" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Inspection?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to delete this record? This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={performDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded bg-[#EA4335] text-white font-medium hover:bg-[#c5221f] shadow transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && currentEditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-normal text-gray-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#4285F4]" />
                Edit Inspection
              </h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveEdit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 uppercase">Date</label>
                    <input 
                      type="date" 
                      name="date"
                      required
                      value={currentEditItem.date} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-[#4285F4] outline-none text-sm"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 uppercase">Time</label>
                    <input 
                      type="time" 
                      name="time"
                      required
                      value={currentEditItem.time || ''} 
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-[#4285F4] outline-none text-sm"
                    />
                 </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 uppercase">Tester</label>
                <select 
                  name="tester" 
                  value={currentEditItem.tester}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-[#4285F4] outline-none text-sm bg-white text-gray-900"
                >
                   {TESTER_NAMES.map(name => (
                     <option key={name} value={name}>{name}</option>
                   ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 uppercase">Grade</label>
                  <input 
                    type="text" 
                    name="grade"
                    value={currentEditItem.grade}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-[#4285F4] outline-none text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 uppercase">Lot Number</label>
                  <input 
                    type="text" 
                    name="lot"
                    value={currentEditItem.lot}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-[#4285F4] outline-none text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                 <label className="text-xs font-medium text-gray-600 uppercase">Roughness Score (Ra)</label>
                 <div className="flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map(score => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => handleRatingChange(score)}
                        className={`flex-1 aspect-square rounded font-bold text-lg flex items-center justify-center transition-all
                          ${currentEditItem.rating === score 
                             ? 'bg-[#1a73e8] text-white shadow-md scale-105' 
                             : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-200'}
                        `}
                      >
                        {score}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="pt-4 flex gap-3">
                 <button 
                   type="button" 
                   onClick={closeEditModal}
                   className="flex-1 py-2.5 rounded border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   type="submit" 
                   disabled={savingEdit}
                   className="flex-1 py-2.5 rounded bg-[#1a73e8] text-white font-medium hover:bg-[#1557b0] shadow transition-colors flex items-center justify-center gap-2 disabled:bg-blue-300"
                 >
                   {savingEdit ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};