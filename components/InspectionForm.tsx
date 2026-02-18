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

  const getLocalTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState<Omit<InspectionData, 'id' | 'createdAt'>>({
    tester: '',
    date: getLocalDate(),
    time: getLocalTime(),
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
        time: getLocalTime(),
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

  // Google Colors for logic
  const getRatingColor = (rating: number) => {
    if (rating <= 2) return 'bg-[#34A853] text-white border-[#34A853]'; // Green
    if (rating === 3) return 'bg-[#FBBC05] text-white border-[#FBBC05]'; // Yellow
    return 'bg-[#EA4335] text-white border-[#EA4335]'; // Red
  };

  const getRatingPreviewClass = (rating: number) => {
    if (rating <= 2) return 'bg-[#e6f4ea] text-[#137333]';
    if (rating === 3) return 'bg-[#fef7e0] text-[#b06000]';
    return 'bg-[#fce8e6] text-[#c5221f]';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-[#4285F4] p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-normal text-white flex items-center gap-2">
          <Save className="w-5 h-5 md:w-6 md:h-6" />
          Record Data
        </h2>
        <p className="text-blue-50 text-sm md:text-base mt-1">New pipe surface roughness evaluation.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-5 md:space-y-6" autoComplete="off">
        {success && (
          <div className="bg-[#e6f4ea] text-[#137333] p-4 rounded flex items-center gap-2 animate-fade-in border border-[#ceead6]">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>Inspection recorded successfully!</span>
          </div>
        )}
        
        {error && (
          <div className="bg-[#fce8e6] text-[#c5221f] p-4 rounded flex items-center gap-2 animate-fade-in border border-[#f9d7d4]">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-1.5 md:space-y-2">
            <label htmlFor="tester" className="text-sm font-medium text-gray-700">Tester Name</label>
            <select
              required
              id="tester"
              name="tester"
              value={formData.tester}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded border border-gray-300 focus:ring-2 focus:ring-[#4285F4] focus:border-[#4285F4] transition-all outline-none bg-white text-base"
            >
              <option value="" disabled>Select Tester</option>
              {TESTER_NAMES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label htmlFor="date" className="text-sm font-medium text-gray-700">Date & Time</label>
            <div className="flex gap-2">
              <input
                required
                id="date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="flex-1 px-4 py-3 rounded border border-gray-300 focus:ring-2 focus:ring-[#4285F4] focus:border-[#4285F4] transition-all outline-none text-base"
              />
              <input
                required
                id="time"
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-32 px-4 py-3 rounded border border-gray-300 focus:ring-2 focus:ring-[#4285F4] focus:border-[#4285F4] transition-all outline-none text-base"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label htmlFor="grade" className="text-sm font-medium text-gray-700">Pipe Grade</label>
            <input
              required
              id="grade"
              type="text"
              name="grade"
              placeholder="e.g. Type A"
              value={formData.grade}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded border border-gray-300 focus:ring-2 focus:ring-[#4285F4] focus:border-[#4285F4] transition-all outline-none text-base"
            />
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label htmlFor="lot" className="text-sm font-medium text-gray-700">Lot Number</label>
            <input
              required
              id="lot"
              type="text"
              name="lot"
              placeholder="e.g. L-2023-001"
              value={formData.lot}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded border border-gray-300 focus:ring-2 focus:ring-[#4285F4] focus:border-[#4285F4] transition-all outline-none text-base"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center mb-1">
             <label className="text-sm font-medium text-gray-700">Roughness Score (Ra)</label>
             <div className={`px-3 py-1 rounded-full text-sm font-bold transition-colors ${getRatingPreviewClass(formData.rating)}`}>
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
                  aspect-square rounded md:rounded-lg flex items-center justify-center text-2xl md:text-3xl font-bold transition-all duration-200 touch-manipulation
                  ${formData.rating === score 
                    ? `${getRatingColor(score)} shadow-md scale-105 ring-2 ring-offset-2 ring-gray-100` 
                    : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
          className={`w-full py-3.5 md:py-4 rounded font-bold text-lg shadow transition-all flex items-center justify-center gap-2 mt-4
            ${loading 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white hover:shadow-md active:scale-[0.99]'
            }`}
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save />}
          {loading ? 'Saving...' : 'Save Inspection'}
        </button>
      </form>
    </div>
  );
};