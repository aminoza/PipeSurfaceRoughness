import React, { useState, useEffect } from 'react';
import { InspectionForm } from './components/InspectionForm';
import { InspectionHistory } from './components/InspectionHistory';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { LayoutDashboard, PlusCircle, History, Menu, X, GripHorizontal, WifiOff } from 'lucide-react';

type View = 'dashboard' | 'new' | 'history';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'new', label: 'New Inspection', icon: <PlusCircle className="w-5 h-5" /> },
  { id: 'history', label: 'History', icon: <History className="w-5 h-5" /> },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white min-h-screen fixed left-0 top-0 z-30 shadow-2xl">
        <div className="p-6 border-b border-slate-700">
           <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg">
               <GripHorizontal className="w-6 h-6 text-white" />
             </div>
             <div>
               <h1 className="text-xl font-bold tracking-tight">PipeSurface</h1>
               <p className="text-xs text-slate-400">Quality Control Pro</p>
             </div>
           </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${currentView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 translate-x-1' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-2 mb-2">
              {isOnline ? (
                <>
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </div>
                  <span className="text-xs text-green-400 font-medium">System Online</span>
                </>
              ) : (
                <>
                  <div className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </div>
                  <span className="text-xs text-red-400 font-medium">Offline Mode</span>
                </>
              )}
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Project ID</p>
            <p className="text-xs text-slate-300 font-mono truncate">pipesurfaceroughness</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
         <div className="flex items-center gap-2">
             <div className="bg-blue-600 p-1.5 rounded-lg">
               <GripHorizontal className="w-5 h-5 text-white" />
             </div>
             <span className="font-bold text-lg">PipeSurface</span>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
            {isMobileMenuOpen ? <X /> : <Menu />}
         </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-slate-900/95 backdrop-blur-sm pt-20 px-6">
           <nav className="space-y-4">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id as View);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-lg font-medium transition-all
                    ${currentView === item.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-800 text-slate-300'
                    }
                  `}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
           </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-6xl mx-auto w-full pt-6">
        {!isOnline && (
           <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 animate-pulse">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">No internet connection. Data may not save immediately.</span>
           </div>
        )}
        <div className="mb-8">
           <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
             {NAV_ITEMS.find(i => i.id === currentView)?.label}
           </h2>
           <p className="text-gray-500 mt-1">
             {currentView === 'dashboard' && 'Overview of inspection performance metrics.'}
             {currentView === 'new' && 'Enter details for a new pipe quality assessment.'}
             {currentView === 'history' && 'Browse and manage past inspection records.'}
           </p>
        </div>

        <div className="animate-fade-in-up">
           {currentView === 'dashboard' && <AnalyticsDashboard />}
           {currentView === 'new' && <InspectionForm />}
           {currentView === 'history' && <InspectionHistory />}
        </div>
      </main>
    </div>
  );
};

export default App;