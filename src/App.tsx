import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Schedule, Song } from './types';
import SongLibrary from './components/SongLibrary';
import ScheduleManager from './components/ScheduleManager';
import SetlistBuilder from './components/SetlistBuilder';
import CalendarView from './components/CalendarView';
import { Guitar, CalendarCheck, Music2, Users } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentView, setCurrentView] = useState<'planner' | 'calendar'>('planner');

  useEffect(() => {
    const q = query(collection(db, 'schedules'), orderBy('service_date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Schedule));
      setSchedules(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'schedules'));
    return () => unsubscribe();
  }, [selectedScheduleId]);

  const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-zinc-200 font-sans flex flex-col overflow-hidden transition-colors">
      <header className="min-h-[4rem] border-b border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between p-4 md:px-8 gap-4 bg-white dark:bg-[#0f0f0f] sticky top-0 z-10 transition-colors shadow-sm dark:shadow-none">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-4">
            <div className="flex relative items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 dark:from-white dark:to-zinc-200 shadow-md ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden group">
              <div className="absolute inset-0 bg-white/10 dark:bg-black/5 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Music2 className="w-5 h-5 text-white dark:text-slate-900 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="flex flex-col border-l-2 border-slate-200 dark:border-white/10 pl-3.5 py-0.5 justify-center">
              <span className="text-[10px] font-mono tracking-[0.3em] font-semibold text-slate-500 dark:text-zinc-500 leading-none mb-1.5 uppercase">GIOR</span>
              <h1 className="text-[1.35rem] font-serif italic tracking-tight text-slate-900 dark:text-zinc-100 leading-none">Worship Portal</h1>
            </div>
          </div>
          <div className="md:hidden">
             <ThemeToggle />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <div className="flex bg-slate-100 dark:bg-black/40 rounded p-1 border border-slate-200 dark:border-white/5 transition-colors">
            <button
              onClick={() => setCurrentView('planner')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded ${currentView === 'planner' ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-black' : 'text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white'}`}
            >
              Planner
            </button>
            <button
              onClick={() => setCurrentView('calendar')}
              className={`flex items-center gap-2 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-colors ${currentView === 'calendar' ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-black' : 'text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white'}`}
            >
              <Users className="w-3 h-3 hidden sm:block" />
              Roster
            </button>
          </div>

          {currentView === 'planner' && (
            <select 
              value={selectedScheduleId || ''} 
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold uppercase text-slate-800 dark:text-white/80 rounded px-3 py-1.5 focus:outline-none focus:border-slate-500 transition-colors max-w-[140px] md:max-w-xs truncate"
            >
              <option value="" disabled className="bg-white dark:bg-zinc-900 text-slate-500 dark:text-white/50">
                {schedules.length === 0 ? "No Services Yet" : "Select a Date..."}
              </option>
              {schedules.map(s => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"> {s.service_date} Service </option>
              ))}
            </select>
          )}
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-slate-900 dark:bg-white text-white dark:text-black px-3 py-1.5 md:px-4 rounded text-[10px] md:text-xs font-bold uppercase tracking-tighter hover:bg-slate-700 dark:hover:bg-slate-200 flex items-center gap-2 transition-colors shrink-0"
          >
            <CalendarCheck className="w-4 h-4 hidden sm:block" />
            <span className="hidden sm:inline">New Service</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      {currentView === 'planner' ? (
        <main className="flex-1 flex flex-col xl:flex-row overflow-auto xl:overflow-hidden w-full max-w-full">
          <div className="flex-1 flex flex-col lg:flex-row overflow-visible xl:overflow-hidden shrink-0">
            <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0d0d0d] p-4 md:p-6 flex flex-col gap-8 overflow-visible xl:overflow-y-auto transition-colors shrink-0">
               {selectedSchedule && <ScheduleManager schedule={selectedSchedule} />}
               {!selectedSchedule && (
                 <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-12 lg:py-0">
                   <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center mb-4 transition-colors">
                     <CalendarCheck className="w-5 h-5 text-slate-600 dark:text-white/50" />
                   </div>
                   <p className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-white/50">Select or create</p>
                 </div>
               )}
            </aside>
            <section className="flex-1 flex flex-col p-4 md:p-8 bg-slate-50 dark:bg-gradient-to-br dark:from-[#0a0a0a] dark:to-[#121212] overflow-visible xl:overflow-y-auto transition-colors shrink-0 min-h-[500px]">
               {selectedSchedule ? (
                 <SetlistBuilder schedule={selectedSchedule} />
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                   <div className="w-16 h-16 rounded bg-slate-200 dark:bg-white/5 flex items-center justify-center mb-6 transition-colors">
                     <Music2 className="w-6 h-6 text-slate-500 dark:text-white/20" />
                   </div>
                   <h2 className="text-xl font-serif italic text-slate-600 dark:text-white/50 mb-2">No Service Selected</h2>
                   <p className="text-sm text-slate-500 dark:text-white/30 max-w-sm">Create a new service schedule using the button in the top right to begin building a setlist.</p>
                 </div>
               )}
            </section>
          </div>
          <aside className="w-full xl:w-[380px] border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0f0f] flex flex-col h-[600px] xl:h-full overflow-hidden transition-colors shrink-0">
            <SongLibrary scheduleId={selectedScheduleId || ''} />
          </aside>
        </main>
      ) : (
        <CalendarView schedules={schedules} />
      )}

      <footer className="h-8 bg-slate-200 dark:bg-zinc-800 flex items-center justify-between px-6 z-20 shrink-0 border-t border-slate-300 dark:border-transparent transition-colors">
        <div className="text-slate-600 dark:text-slate-500 text-[9px] font-bold uppercase tracking-[0.15em]">System Status: All systems operational</div>
        <div className="text-slate-600 dark:text-slate-500 text-[9px] font-bold uppercase tracking-[0.15em]">Auto-Syncing to Cloud Database...</div>
      </footer>

      {showCreateModal && <CreateScheduleModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}

function CreateScheduleModal({ onClose }: { onClose: () => void }) {
  const [dateStr, setDateStr] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      setError("Please put a valid date format YYYY-MM-DD");
      return;
    }
    try {
      await addDoc(collection(db, 'schedules'), {
        service_date: dateStr,
        createdAt: Date.now()
      });
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'schedules');
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-white/10 rounded-lg w-full max-w-sm shadow-2xl overflow-hidden flex flex-col font-sans transition-colors">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a0a0a] transition-colors">
          <h3 className="text-sm uppercase tracking-widest font-bold text-slate-900 dark:text-slate-200">New Service</h3>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-white/40 mb-1">Service Date</label>
            <input 
              type="date" required value={dateStr} onChange={e => setDateStr(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 transition-colors"
            />
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
          <button type="submit" className="w-full bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest py-2 rounded transition-colors mt-2">
            Create Schedule
          </button>
        </form>
      </div>
    </div>
  )
}
