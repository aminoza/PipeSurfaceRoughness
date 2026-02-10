import React, { useState } from 'react';
import { db, collection, addDoc } from '../firebase';
import { InspectionData } from '../types';
import { Loader2, CheckCircle, AlertCircle, Save } from 'lucide-react';

const TESTER_NAMES = [
  "Kriengsak Tarasri",
  "Thanon Kahadit",
  "Jarun Thaijaroen",
  "Danai Paragum",
  "Pradit Nutthanara",
  "Saikhim Panawes",
  "Thunchanok Hongsakul"
];

export const InspectionForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to get local date string YYYY-MM-DD
  const getLocalDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<Omit<InspectionData, 'id' | 'createdAt'>>({
    tester: '',
    date: getLocalDate(),
    grade: '',
    lot: '',
    rating: 1,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await addDoc(collection(db, "inspections"), {
        ...formData,
        createdAt: Date.now()
      });
      setSuccess(true);
      setFormData({
        tester: '',
        date: getLocalDate(),
        grade: '',
        lot: '',
        rating: 1,
      });
      setTimeout(() => setSuccess(false), 3000);
      
      // Optional: Scroll to top on mobile after submit
      if (window.innerWidth < 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error("Error adding document: ", err);
      setError("Failed to save data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-blue-600 p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <Save className="w-5 h-5 md:w-6 md:h-6" />
          Record Data
        </h2>
        <p className="text-blue-100 text-sm md:text-base mt-1">New pipe surface roughness evaluation.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-5 md:space-y-6" autoComplete="off">
        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2 animate-fade-in border border-green-200">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>Inspection recorded successfully!</span>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 animate-fade-in border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-1.5 md:space-y-2">
            <label htmlFor="tester" className="text-sm font-semibold text-gray-700">Tester Name</label>
            <select
              required
              id="tester"
              name="tester"
              value={formData.tester}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white text-base"
            >
              <option value="" disabled>Select Tester</option>
              {TESTER_NAMES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label htmlFor="date" className="text-sm font-semibold text-gray-700">Date</label>
            <input
              required
              id="date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-base"
            />
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label htmlFor="grade" className="text-sm font-semibold text-gray-700">Pipe Grade</label>
            <input
              required
              id="grade"
              type="text"
              name="grade"
              placeholder="e.g. Type A"
              value={formData.grade}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-base"
            />
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label htmlFor="lot" className="text-sm font-semibold text-gray-700">Lot Number</label>
            <input
              required
              id="lot"
              type="text"
              name="lot"
              placeholder="e.g. L-2023-001"
              value={formData.lot}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-base"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center mb-1">
             <label className="text-sm font-semibold text-gray-700">Roughness Score (Ra)</label>
             <div className={`px-3 py-1 rounded-full text-sm font-bold transition-colors
                ${formData.rating <= 2 ? 'bg-green-100 text-green-700' : 
                  formData.rating === 3 ? 'bg-orange-100 text-orange-700' : 
                  'bg-red-100 text-red-700'}`}>
                Selected: {formData.rating}
             </div>
          </div>
          
          <div className="grid grid-cols-5 gap-2 md:gap-3">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, rating: score }))}
                className={`
                  aspect-square rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-bold transition-all duration-200 touch-manipulation
                  ${formData.rating === score 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105 ring-2 md:ring-4 ring-blue-50' 
                    : 'bg-white text-gray-400 border border-gray-200 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50'
                  }
                `}
              >
                {score}
              </button>
            ))}
          </div>
          
          <div className="flex justify-between text-xs text-gray-400 px-2 font-medium">
            <span>Smooth (1)</span>
            <span>Rough (5)</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3.5 md:py-4 rounded-lg font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2 mt-4
            ${loading 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg active:scale-[0.98]'
            }`}
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save />}
          {loading ? 'Saving...' : 'Save Inspection'}
        </button>
      </form>
    </div>
  );
};