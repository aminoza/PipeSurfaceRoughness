import React, { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, deleteDoc, doc } from '../firebase';
import { InspectionData } from '../types';
import { Trash2, Search, Calendar, User, Box, Activity, FileText } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600"/>
            History Log
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search logs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredInspections.length === 0 ? (
           <div className="text-center py-12 bg-white rounded-xl shadow-sm">
             <div className="bg-gray-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Box className="w-8 h-8 text-gray-400" />
             </div>
             <p className="text-gray-500 text-lg">No records found</p>
           </div>
        ) : (
          filteredInspections.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative">
                <button 
                  onClick={() => item.id && handleDelete(item.id)}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete Record"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                           <Calendar className="w-4 h-4" />
                           <span>{item.date}</span>
                           <span className="text-gray-300">|</span>
                           <User className="w-4 h-4" />
                           <span className="font-medium text-gray-700">{item.tester}</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <h3 className="text-lg font-bold text-gray-900">{item.lot}</h3>
                           <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border border-gray-200">
                             {item.grade}
                           </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 sm:mt-0">
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Score</p>
                            <div className={`text-2xl font-bold flex items-center gap-1 justify-end
                                ${item.rating <= 2 ? 'text-green-600' : item.rating === 3 ? 'text-orange-500' : 'text-red-600'}
                            `}>
                                <Activity className="w-5 h-5" />
                                {item.rating}
                            </div>
                        </div>
                        <div className={`w-2 h-12 rounded-full hidden sm:block
                             ${item.rating <= 2 ? 'bg-green-500' : item.rating === 3 ? 'bg-orange-500' : 'bg-red-500'}
                        `}></div>
                    </div>
                </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};