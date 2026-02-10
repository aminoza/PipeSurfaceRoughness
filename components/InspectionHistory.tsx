import React, { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, deleteDoc, doc } from '../firebase';
import { InspectionData } from '../types';
import { Trash2, Search, Calendar, User, Box, Activity, FileText, Download } from 'lucide-react';

export const InspectionHistory: React.FC = () => {
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, "inspections"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InspectionData));
      setInspections(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteDoc(doc(db, "inspections", id));
      } catch (err) {
        console.error("Error deleting document: ", err);
      }
    }
  };

  const handleExport = () => {
    if (inspections.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ['Date', 'Tester', 'Pipe Grade', 'Lot Number', 'Roughness Score (Ra)'];
    const rows = inspections.map(item => [
      item.date,
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-600"/>
            History Log
        </h2>
        
        <div className="flex flex-col-reverse md:flex-row gap-2 md:gap-3 w-full lg:w-auto">
          <div className="relative flex-grow lg:flex-grow-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full lg:w-64 outline-none bg-white shadow-sm text-sm md:text-base"
            />
          </div>
          
          <button 
            onClick={handleExport}
            disabled={inspections.length === 0}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-lg font-semibold transition-all shadow-sm active:scale-95 text-sm md:text-base"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:gap-4 pb-20 md:pb-0">
        {filteredInspections.length === 0 ? (
           <div className="text-center py-8 md:py-12 bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-200">
             <div className="bg-gray-50 p-3 md:p-4 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Box className="w-6 h-6 md:w-8 md:h-8 text-gray-300" />
             </div>
             <p className="text-gray-500 text-base md:text-lg">No records found</p>
           </div>
        ) : (
          filteredInspections.map((item) => (
            <div key={item.id} className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative">
                <button 
                  onClick={() => item.id && handleDelete(item.id)}
                  className="absolute top-2 right-2 md:top-4 md:right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-all z-10"
                  title="Delete Record"
                >
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500 mb-1">
                           <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                           <span>{item.date}</span>
                           <span className="text-gray-300">|</span>
                           <User className="w-3 h-3 md:w-4 md:h-4" />
                           <span className="font-medium text-gray-700 truncate max-w-[120px] md:max-w-none">{item.tester}</span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                           <h3 className="text-base md:text-lg font-bold text-gray-900">{item.lot}</h3>
                           <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] md:text-xs font-semibold uppercase tracking-wider border border-gray-200">
                             {item.grade}
                           </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-4 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-50">
                        <span className="text-xs text-gray-400 sm:hidden">Roughness Score</span>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className={`text-xl md:text-2xl font-bold flex items-center gap-1 justify-end
                                    ${item.rating <= 2 ? 'text-green-600' : item.rating === 3 ? 'text-orange-500' : 'text-red-600'}
                                `}>
                                    <Activity className="w-4 h-4 md:w-5 md:h-5" />
                                    {item.rating}
                                </div>
                            </div>
                            <div className={`w-2 h-10 md:h-12 rounded-full
                                 ${item.rating <= 2 ? 'bg-green-500' : item.rating === 3 ? 'bg-orange-500' : 'bg-red-500'}
                            `}></div>
                        </div>
                    </div>
                </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};