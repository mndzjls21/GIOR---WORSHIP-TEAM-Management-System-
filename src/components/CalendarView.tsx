import React, { useState } from 'react';
import { Schedule } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { Trash2, Eraser, AlertCircle, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { toPng } from 'html-to-image';

export default function CalendarView({ schedules }: { schedules: Schedule[] }) {
  // Sort schedules by date
  const sortedSchedules = [...schedules].sort((a, b) => new Date(a.service_date).getTime() - new Date(b.service_date).getTime());

  // Group sorted schedules by month
  const groupedSchedules = sortedSchedules.reduce((acc, schedule) => {
    try {
      const monthYear = format(parseISO(schedule.service_date), 'MMMM yyyy');
      if (!acc[monthYear]) acc[monthYear] = [];
      acc[monthYear].push(schedule);
    } catch (e) {
      if (!acc['Other']) acc['Other'] = [];
      acc['Other'].push(schedule);
    }
    return acc;
  }, {} as Record<string, Schedule[]>);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [exportingMonth, setExportingMonth] = useState<string | null>(null);

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [month]: prev[month] === undefined ? true : !prev[month]
    }));
  };

  const isMonthExpanded = (month: string, index: number) => {
    if (expandedMonths[month] !== undefined) return expandedMonths[month];
    return false; // Default to collapsed
  };

  const handleDownloadPNG = async (monthYear: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportingMonth(monthYear);
    
    setTimeout(async () => {
      const element = document.getElementById(`export-${monthYear.replace(/ /g, '-')}`);
      if (!element) {
        setExportingMonth(null);
        return;
      }
      
      try {
        const isDark = document.documentElement.classList.contains('dark');
        const dataUrl = await toPng(element, {
          backgroundColor: isDark ? '#18181b' : '#ffffff', // zinc-900 or white
          pixelRatio: 3,
          filter: (node) => {
            if (node?.hasAttribute && node.hasAttribute('data-html2canvas-ignore')) {
              return false;
            }
            return true;
          }
        });
        const link = document.createElement('a');
        link.download = `roster-${monthYear.toLowerCase().replace(/ /g, '-')}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to generate image', err);
      } finally {
        setExportingMonth(null);
      }
    }, 100);
  };

  const handleClearRoster = (schedule: Schedule) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Roster',
      message: 'Are you sure you want to clear this team roster? All assignments will be removed.',
      action: async () => {
        try {
          await updateDoc(doc(db, 'schedules', schedule.id), {
            presider: '', lead_guitar: '', acoustic_guitar: '', bassist: '',
            keyboardist: '', drummer: '', backup_vocals: '', projectionist: '',
            livestreamer: '', photographer: '', mixer: ''
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `schedules/${schedule.id}`);
        }
      }
    });
  };

  const handleDeleteSchedule = (schedule: Schedule) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Schedule',
      message: 'Are you sure you want to delete this schedule & roster completely? This cannot be undone.',
      action: async () => {
        try {
          await deleteDoc(doc(db, 'schedules', schedule.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `schedules/${schedule.id}`);
        }
      }
    });
  };

  const executeConfirmAction = async () => {
    if (confirmDialog && confirmDialog.action) {
      await confirmDialog.action();
      setConfirmDialog(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-zinc-950 transition-colors p-4 md:p-8 min-h-0 w-full max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif italic text-slate-900 dark:text-white mb-2">Team Roster</h2>
          <p className="text-slate-600 dark:text-zinc-400 text-sm">View scheduling for worship team members across all upcoming services.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {sortedSchedules.length === 0 ? (
          <div className="text-center py-12 text-slate-600 dark:text-zinc-400 italic">No services scheduled yet.</div>
        ) : (
          Object.entries(groupedSchedules).map(([monthYear, monthSchedules], index) => {
            const expanded = isMonthExpanded(monthYear, index);
            return (
            <div key={monthYear} id={`export-${monthYear.replace(/ /g, '-')}`} className={`flex flex-col gap-4 rounded-xl ${exportingMonth === monthYear ? 'w-[768px] min-w-[768px] p-8 md:p-12 bg-slate-50 dark:bg-zinc-950 mx-auto' : ''}`}>
              {exportingMonth === monthYear && (
                <div className="text-center mb-6 pt-4 border-b border-slate-200 dark:border-white/10 pb-8">
                  <h2 className="text-4xl md:text-5xl font-serif italic text-slate-900 dark:text-white mb-3">Schedule for {monthYear}</h2>
                  <p className="text-slate-500 dark:text-zinc-400 capitalize tracking-widest text-sm font-bold font-sans">GIOR // Worship Team Roster</p>
                </div>
              )}
              {exportingMonth !== monthYear && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleMonth(monthYear)}
                    className="flex items-center gap-2 md:gap-4 text-left group bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-lg p-3 md:p-4 hover:border-slate-300 dark:hover:border-white/20 transition-colors shadow-sm dark:shadow-none flex-1 min-w-0"
                  >
                    <div className="flex shrink-0 items-center justify-center bg-slate-100 dark:bg-white/5 w-8 h-8 rounded text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">{monthYear}</h3>
                    <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 ml-auto bg-slate-100 dark:bg-white/5 px-2 md:px-3 py-1 rounded shrink-0 whitespace-nowrap hidden sm:block">
                      {monthSchedules.length} {monthSchedules.length === 1 ? 'Service' : 'Services'}
                    </div>
                  </button>
                  {expanded && (
                    <button 
                      onClick={(e) => handleDownloadPNG(monthYear, e)}
                      className="flex shrink-0 items-center justify-center gap-2 bg-slate-900 dark:bg-slate-200 text-white dark:text-black p-3 sm:px-4 sm:py-4 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-slate-800 dark:hover:bg-white transition-colors self-stretch sm:h-[66px]"
                      title="Download schedule as image"
                    >
                      <Download className="w-5 h-5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Download PNG</span>
                    </button>
                  )}
                </div>
              )}
              
              {expanded && (
              <div className={`flex flex-col gap-6 ${exportingMonth === monthYear ? '' : 'pl-2 md:pl-12 border-l-2 border-slate-100 dark:border-white/5 ml-4 md:ml-8 mt-2'}`}>
                {monthSchedules.map(schedule => (
                  <div key={schedule.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 transition-colors rounded-lg p-6 relative overflow-hidden group shadow-sm dark:shadow-none">
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-800 dark:bg-slate-200 transition-colors"></div>
                    
                    <div className={exportingMonth === monthYear ? "flex flex-col gap-6" : "flex flex-col md:flex-row gap-8"}>
                      <div className={exportingMonth === monthYear ? "w-full border-b border-slate-200 dark:border-white/10 pb-4" : "w-full md:w-1/4 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 transition-colors pb-4 md:pb-0 md:pr-4"}>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-1 mt-1">
                          {format(parseISO(schedule.service_date), 'MMM d, yyyy')}
                        </h3>
                        <div className="text-slate-900 dark:text-slate-100 text-xs font-bold uppercase tracking-widest mb-4 md:mb-0">
                          Sunday Service
                        </div>
                        
                        {exportingMonth !== monthYear && (
                          <div className="flex items-center gap-2 mt-4">
                            <button 
                              onClick={() => handleClearRoster(schedule)}
                              className="flex-1 flex justify-center items-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 hover:border-slate-300 dark:border-white/5 dark:hover:border-white/20 rounded transition-colors"
                            >
                              <Eraser className="w-3 h-3" />
                              Clear
                            </button>
                            <button 
                              onClick={() => handleDeleteSchedule(schedule)}
                              className="flex justify-center items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-500/70 hover:text-red-600 dark:hover:text-red-400 border border-red-500/20 hover:border-red-500/40 dark:border-red-500/10 dark:hover:border-red-500/30 rounded transition-colors"
                              title="Delete Schedule"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className={exportingMonth === monthYear ? "grid grid-cols-2 lg:grid-cols-2 gap-x-6 gap-y-6 w-full" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 w-full"}>
                        <RosterItem exporting={exportingMonth === monthYear} label="Presider" value={schedule.presider} highlight />
                        <RosterItem exporting={exportingMonth === monthYear} label="Lead Guitar" value={schedule.lead_guitar} />
                        <RosterItem exporting={exportingMonth === monthYear} label="Acoustic Guitarist" value={schedule.acoustic_guitar} />
                        <RosterItem exporting={exportingMonth === monthYear} label="Bassist" value={schedule.bassist} />
                        <RosterItem exporting={exportingMonth === monthYear} label="Keyboardist" value={schedule.keyboardist} />
                        <RosterItem exporting={exportingMonth === monthYear} label="Drummer" value={schedule.drummer} />
                        <RosterItem exporting={exportingMonth === monthYear} label="Back Up/Vocals" value={schedule.backup_vocals} />
                        <RosterItem exporting={exportingMonth === monthYear} label="Projectionist" value={schedule.projectionist} />
                        <RosterItem exporting={exportingMonth === monthYear} label="Livestreamer" value={schedule.livestreamer} />
                        <RosterItem exporting={exportingMonth === monthYear} label="Photographer" value={schedule.photographer} />
                        <RosterItem exporting={exportingMonth === monthYear} label="Mixer" value={schedule.mixer} />
                      </div>
                    </div>

                    {schedule.notes && (
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 transition-colors">
                        <div className="text-[10px] text-slate-600 dark:text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">Notes & Reminders</div>
                        <div className="text-sm text-slate-800 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {schedule.notes}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>
          )})
        )}
      </div>

      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 transition-colors backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-lg shadow-2xl max-w-sm w-full p-6 text-center font-sans">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeConfirmAction}
                className="flex-1 py-2 text-xs font-bold uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RosterItem({ label, value, highlight, exporting }: { label: string, value: string | undefined, highlight?: boolean, exporting?: boolean }) {
  if (highlight) {
    return (
      <div className={`flex flex-col bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 p-4 rounded-xl mb-2 shadow-sm transition-colors ${exporting ? 'col-span-1 lg:col-span-2' : 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4'}`}>
        <span className={`${exporting ? 'text-xs' : 'text-[10px]'} uppercase tracking-widest text-slate-600 dark:text-zinc-400 font-bold mb-1`}>{label}</span>
        <span className={`${exporting ? 'text-2xl' : 'text-base'} font-bold text-slate-900 dark:text-white`}>
          {value && value.trim() ? value : <span className="text-slate-500 dark:text-zinc-500 italic font-normal">Unassigned</span>}
        </span>
      </div>
    )
  }
  return (
    <div className="flex flex-col">
      <span className={`${exporting ? 'text-sm' : 'text-[10px]'} uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-1`}>{label}</span>
      <span className={`${exporting ? 'text-xl' : 'text-sm'} font-medium text-slate-800 dark:text-zinc-300`}>
        {value && value.trim() ? value : <span className="text-slate-500 dark:text-zinc-500 italic font-normal">Unassigned</span>}
      </span>
    </div>
  )
}
