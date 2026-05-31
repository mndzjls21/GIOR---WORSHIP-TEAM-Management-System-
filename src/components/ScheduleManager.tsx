import React, { useState, useEffect } from 'react';
import { Schedule, BlackoutDate } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { updateDoc, doc, collection, onSnapshot, query, where, addDoc, deleteDoc } from 'firebase/firestore';
import { Users, AlertTriangle, X, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ScheduleManager({ schedule }: { schedule: Schedule }) {
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>([]);
  const [showBlackoutModal, setShowBlackoutModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'blackout_dates'));
    const unsub = onSnapshot(q, (snap) => {
      setBlackouts(snap.docs.map(d => ({ id: d.id, ...d.data() } as BlackoutDate)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'blackout_dates'));
    return () => unsub();
  }, []);

  const updateRole = async (field: keyof Schedule, value: string) => {
    try {
      await updateDoc(doc(db, 'schedules', schedule.id), { [field]: value });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `schedules/${schedule.id}`);
    }
  };

  const getBlackoutWarning = (name: string, date: string) => {
    if (!name.trim()) return null;
    const names = name.split(',').map(n => n.trim().toLowerCase());
    
    // Check if any listed name has a blackout for THIS date
    for (const b of blackouts) {
      if (b.unavailable_date === date && names.includes(b.member_name.toLowerCase())) {
        return `${b.member_name} is unavailable on this date.`;
      }
    }
    return null;
  };

  const roles = [
    { id: 'presider', label: 'Presider' },
    { id: 'lead_guitar', label: 'Lead Guitar' },
    { id: 'acoustic_guitar', label: 'Acoustic Guitarist' },
    { id: 'bassist', label: 'Bassist' },
    { id: 'keyboardist', label: 'Keyboardist' },
    { id: 'drummer', label: 'Drummer' },
    { id: 'backup_vocals', label: 'Back Up/Vocals' },
    { id: 'projectionist', label: 'Projectionist' },
    { id: 'livestreamer', label: 'Livestreamer' },
    { id: 'photographer', label: 'Photographer' },
  ] as const;

  const handleClearRoster = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Roster',
      message: 'Are you sure you want to clear this team roster? All assignments will be removed.',
      action: async () => {
        try {
          await updateDoc(doc(db, 'schedules', schedule.id), {
            presider: '', lead_guitar: '', acoustic_guitar: '', bassist: '',
            keyboardist: '', drummer: '', backup_vocals: '', projectionist: '',
            livestreamer: '', photographer: ''
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `schedules/${schedule.id}`);
        }
      }
    });
  };

  const handleDeleteSchedule = () => {
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
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-600 dark:text-zinc-400">Roster // {schedule.service_date}</h3>
          <button 
            onClick={() => setShowBlackoutModal(true)}
            className="text-[10px] text-slate-600 dark:text-zinc-400 hover:text-red-400 transition-colors"
          >
            Blackouts
          </button>
        </div>

        <div className="space-y-3">
          {roles.map(role => {
            const val = schedule[role.id] || '';
            const warning = getBlackoutWarning(val, schedule.service_date);
            
            return (
              <div key={role.id} className="flex flex-col">
                <label className="text-[10px] text-slate-600 dark:text-zinc-400 uppercase">{role.label}</label>
                <div className="flex flex-col mt-1 relative">
                  {role.id === 'backup_vocals' ? (
                    <MultipleRoleInput 
                      val={val} 
                      roleId={role.id} 
                      scheduleId={schedule.id}
                      warning={!!warning}
                      onChange={(newVal) => updateRole(role.id, newVal)} 
                    />
                  ) : (
                    <input 
                      type="text"
                      list={`members-list-${schedule.id}-${role.id}`}
                      value={val}
                      onChange={(e) => updateRole(role.id, e.target.value)}
                      placeholder="Select or type..."
                      className={cn(
                        "w-full bg-transparent border-b text-slate-900 dark:text-white text-sm focus:outline-none transition-all pb-1",
                        warning ? "border-slate-300 dark:border-slate-700 transition-colors" : "border-slate-300 dark:border-white/10 transition-colors focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
                      )}
                    />
                  )}
                  <datalist id={`members-list-${schedule.id}-${role.id}`}>
                    {[
                      "Adora Fajardo",
                      "Cristina Recondo",
                      "Dionalyn Leonardo",
                      "Farah Borromeo",
                      "JC Mendoza",
                      "Jilson Reverente",
                      "John Mark Recondo",
                      "John Patrick Leonardo",
                      "John Paul Borromeo",
                      "JP Recondo",
                      "Juan Enrico Ronquillo",
                      "Kim Mendoza",
                      "Maria Menchie De Lumban",
                      "Mark John Casada",
                      "Nicole Joy Quiminiano",
                      "Paul David Fajardo",
                      "Sunny Rosantos",
                      "Yasmeen Borromeo"
                    ].map(member => (
                      <option key={member} value={member} />
                    ))}
                  </datalist>
                  {warning && (
                    <div className="mt-1 flex items-center justify-between">
                      <span></span>
                      <span className="text-[9px] text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-1 rounded truncate transition-colors">⚠️ Blackout</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 mt-6 border-t border-slate-200 dark:border-white/10 transition-colors flex flex-col">
          <label className="text-[10px] text-slate-600 dark:text-zinc-400 uppercase mb-2">Service Notes & Reminders</label>
          <textarea
            value={schedule.notes || ''}
            onChange={(e) => updateRole('notes', e.target.value)}
            placeholder="Important notes for this service..."
            rows={3}
            className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 resize-y"
          />
        </div>

        <div className="pt-6 mt-6 border-t border-slate-200 dark:border-white/10 transition-colors flex flex-col gap-2">
          <button 
            onClick={handleClearRoster}
            className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10"
          >
            Clear Roster
          </button>
          
          <button 
            onClick={handleDeleteSchedule}
            className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
          >
            Delete Schedule & Roster
          </button>
        </div>
      </div>

      {showBlackoutModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 transition-colors backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <BlackoutBoard 
            blackouts={blackouts} 
            onClose={() => setShowBlackoutModal(false)} 
          />
        </div>
      )}

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
    </>
  );
}

function BlackoutBoard({ blackouts, onClose }: { blackouts: BlackoutDate[], onClose: () => void }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;
    try {
      await addDoc(collection(db, 'blackout_dates'), {
        member_name: name.trim(),
        unavailable_date: date,
        createdAt: Date.now()
      });
      setName('');
      setDate('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'blackout_dates');
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'blackout_dates', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `blackout_dates/${id}`);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded-lg w-full max-w-md shadow-2xl overflow-hidden flex flex-col font-sans">
      <div className="flex items-center justify-between p-4 border-b border-slate-300 dark:border-white/10 transition-colors bg-slate-50 dark:bg-zinc-950 transition-colors">
        <h3 className="text-sm uppercase tracking-widest font-bold text-slate-900 dark:text-slate-100">Blackout Board</h3>
        <button onClick={onClose} className="p-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto max-h-[60vh] space-y-6">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
               <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-1">Name</label>
               <input 
                 type="text" required placeholder="e.g. David" value={name} onChange={e => setName(e.target.value)}
                 className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
               />
            </div>
            <div>
               <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-1">Date</label>
               <input 
                 type="date" required value={date} onChange={e => setDate(e.target.value)}
                 className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
               />
            </div>
          </div>
          <button type="submit" className="bg-slate-900 dark:bg-slate-200 text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-300 text-[10px] font-bold uppercase tracking-widest py-2 rounded transition-colors">
            Log Absence
          </button>
        </form>

        <div className="space-y-2">
          {blackouts.sort((a,b) => b.createdAt - a.createdAt).map(b => (
            <div key={b.id} className="flex items-center justify-between text-sm p-3 rounded bg-slate-200 dark:bg-white/5 transition-colors border border-slate-300 dark:border-white/10 transition-colors">
              <span className="font-medium text-slate-900 dark:text-white">{b.member_name}</span>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-slate-600 dark:text-zinc-400">{b.unavailable_date}</span>
                <button onClick={() => remove(b.id)} className="text-slate-600 dark:text-zinc-400 hover:text-red-400 transition-colors"><X className="w-3 h-3"/></button>
              </div>
            </div>
          ))}
          {blackouts.length === 0 && (
            <div className="text-center p-4 text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400">No blackouts logged.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MultipleRoleInput({ val, warning, roleId, scheduleId, onChange }: { val: string, warning: boolean, roleId: string, scheduleId: string, onChange: (val: string) => void }) {
  const [inputValue, setInputValue] = useState('');
  
  const names = val.split(',').map(n => n.trim()).filter(Boolean);
  
  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputValue.trim()) {
      const newNames = [...names, inputValue.trim()];
      onChange(newNames.join(', '));
      setInputValue('');
    }
  };

  const removeName = (nameToRemove: string) => {
    const newNames = names.filter(n => n !== nameToRemove);
    onChange(newNames.join(', '));
  };

  return (
    <div className="flex flex-col gap-1 w-full relative">
      {(names.length > 0) && (
        <div className="flex flex-wrap gap-1 mb-1">
          {names.map((n, i) => (
            <span key={i} className="text-[10px] bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-300 dark:border-white/5">
              {n} 
              <button 
                type="button"
                onClick={() => removeName(n)}
                className="hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2 w-full">
        <input 
          type="text"
          list={`members-list-${scheduleId}-${roleId}`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Select or type..."
          className={cn(
            "flex-1 bg-transparent border-b text-slate-900 dark:text-white text-sm focus:outline-none transition-all pb-1",
            warning ? "border-slate-300 dark:border-slate-700 transition-colors" : "border-slate-300 dark:border-white/10 transition-colors focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
          )}
        />
        <button 
          type="button" 
          onClick={() => handleAdd()}
          className="text-[9px] bg-slate-900 dark:bg-white text-white dark:text-black px-2 py-1 rounded font-bold uppercase tracking-widest shrink-0"
        >
          Add
        </button>
      </div>
    </div>
  )
}

