import React, { useState, useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { InspectionForm } from './components/InspectionForm';
import { InspectionHistory } from './components/InspectionHistory';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { LayoutDashboard, PlusCircle, History, GripHorizontal, WifiOff } from 'lucide-react';

type View = 'dashboard' | 'new' | 'history';

const NAV_ITEMS = [
  { id: 'new', label: 'New', icon: <PlusCircle className="w-5 h-5" /> },
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'history', label: 'History', icon: <History className="w-5 h-5" /> },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('new');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAutohide, setIsAutohide] = useState(false);

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
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Sidebar Navigation (Desktop Only) - Google Style */}
      <aside 
        className={`hidden md:flex flex-col bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 z-30 transition-all duration-300 ease-in-out group
          ${isAutohide ? 'w-20 hover:w-64 shadow-xl' : 'w-64'}
        `}
      >
        <div className="p-6 h-20 flex items-center overflow-hidden">
           <div className="flex items-center gap-3 min-w-max">
             <div className="flex items-center justify-center w-8 h-8">
                <GripHorizontal className="w-8 h-8 text-[#4285F4]" />
             </div>
             <div className={`transition-opacity duration-300 ${isAutohide ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
               <h1 className="text-xl font-bold tracking-tight text-gray-700 font-sans">PipeSurface</h1>
               <p className="text-xs text-gray-400">Quality Control</p>
             </div>
           </div>
        </div>
        
        <nav className="flex-1 px-3 space-y-1 overflow-hidden">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              title={isAutohide ? item.label : ''}
              className={`w-full flex items-center gap-4 px-3 py-3 rounded-r-full text-sm font-medium transition-colors duration-200 whitespace-nowrap
                ${currentView === item.id 
                  ? 'bg-[#e8f0fe] text-[#1967d2]' /* Google Active State Blue */
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <div className="min-w-[1.25rem] flex items-center justify-center">
                 {item.icon}
              </div>
              <span className={`transition-opacity duration-300 ${isAutohide ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                {item.label === 'New' ? 'New Inspection' : item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-100 overflow-hidden">
            {/* Autohide Toggle Switch */}
            <div className="flex items-center justify-between mb-4 min-w-max">
                 <span className={`text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap transition-opacity duration-300 ${isAutohide ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                    Autohide
                 </span>
                 <button
                    onClick={() => setIsAutohide(!isAutohide)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:ring-offset-2 ${isAutohide ? 'bg-[#4285F4]' : 'bg-gray-300'}`}
                    title="Toggle Autohide Sidebar"
                 >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ${isAutohide ? 'translate-x-5' : 'translate-x-1'}`} />
                 </button>
            </div>

            <div className={`transition-opacity duration-300 ${isAutohide ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
              <div className="flex items-center gap-2 mb-2 whitespace-nowrap">
                {isOnline ? (
                  <>
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34A853] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34A853]"></span>
                    </div>
                    <span className="text-xs text-[#34A853] font-medium">System Online</span>
                  </>
                ) : (
                  <>
                    <div className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EA4335]"></span>
                    </div>
                    <span className="text-xs text-[#EA4335] font-medium">Offline Mode</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 whitespace-nowrap">Project ID</p>
              <p className="text-xs text-gray-600 font-mono truncate">pipesurfaceroughness</p>
            </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white text-gray-800 p-4 sticky top-0 z-40 shadow-sm border-b border-gray-200 flex items-center justify-between">
         <div className="flex items-center gap-2">
             <GripHorizontal className="w-6 h-6 text-[#4285F4]" />
             <span className="font-bold text-lg tracking-tight text-gray-700">PipeSurface</span>
         </div>
         <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#34A853]' : 'bg-[#EA4335]'}`} title={isOnline ? "Online" : "Offline"} />
      </header>

      {/* Bottom Navigation Bar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-4 z-50 flex justify-around items-center h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id as View)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200
              ${currentView === item.id 
                ? 'text-[#4285F4]' 
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <div className={`transition-transform duration-200 ${currentView === item.id ? 'scale-110' : ''}`}>
               {item.icon}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main 
        className={`flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full pt-4 md:pt-6 transition-all duration-300 ease-in-out
          ${isAutohide ? 'md:ml-20' : 'md:ml-64'}
        `}
      >
        {!isOnline && (
           <div className="mb-4 p-3 bg-[#fce8e6] border border-[#f9d7d4] text-[#c5221f] rounded-lg flex items-center gap-2 animate-pulse text-sm">
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">No internet. Data will sync later.</span>
           </div>
        )}
        
        <div className="animate-fade-in-up">
           {currentView === 'dashboard' && <AnalyticsDashboard />}
           {currentView === 'new' && <InspectionForm />}
           {currentView === 'history' && <InspectionHistory />}
        </div>
      </main>
      <SpeedInsights />
    </div>
  );
};

export default App;