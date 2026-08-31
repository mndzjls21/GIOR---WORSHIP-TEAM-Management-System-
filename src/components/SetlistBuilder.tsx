import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { Schedule, Setlist, Song, SetlistSong } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, doc, updateDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { GripVertical, X, AlertCircle, CheckCircle2, Play, Pause, Activity, Mic2, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import LiveTransposer from './LiveTransposer';

function getLabelColor(label: string) {
  switch(label) {
    case 'Opening/Preparatory Song': return 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300';
    case 'After Message/Worship song': return 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300';
    case 'Offering Song': return 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300';
    case 'Special Offering Song': return 'text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300';
    case 'Communion Song': return 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300';
    case 'Special Number Song': return 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300';
    case 'Worship': return 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300';
    default: return 'text-slate-900 dark:text-slate-100/70 hover:text-slate-900 dark:hover:text-slate-100';
  }
}


function SortableSetlistItem({
  item,
  originalIndex,
  isSelected,
  setActiveSongId,
  updateSetlist,
  removeSetlist,
  setCurrentRehearsalIndex,
  setShowRehearsal,
  transitions,
  getBestUrl,
  getLabelColor
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const hasMediaLink = !!getBestUrl(item.song);

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      {transitions && transitions.length > 0 && (
        <div className="flex justify-center h-8 items-center pointer-events-none">
          {transitions.map((t: any, i: number) => (
            <div key={i} className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full border transition-colors",
              t.type === 'danger' ? "bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" : 
              t.type === 'warning' ? "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700" : "bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
            )}>
              <span className={cn(
                "text-[9px] uppercase tracking-tighter font-bold transition-colors",
                t.type === 'danger' ? "text-red-600 dark:text-red-400" : 
                t.type === 'warning' ? "text-slate-800 dark:text-slate-300" : "text-emerald-700 dark:text-emerald-400"
              )}>
                {t.msg}
              </span>
            </div>
          ))}
        </div>
      )}

      <div 
        className={cn(
          "bg-slate-200 dark:bg-white/5 transition-colors border rounded-lg flex flex-col transition-all",
          isSelected ? "border-slate-400 dark:border-slate-500 bg-white dark:bg-white/10 shadow-sm" : "border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-slate-500",
          isDragging ? "opacity-60 shadow-lg ring-2 ring-indigo-500/20" : ""
        )}
      >
        <div className="flex flex-wrap md:flex-nowrap items-start md:items-center p-3 md:p-4 gap-3 md:gap-4" onClick={() => setActiveSongId(isSelected ? null : item.id)}>
          <div 
            className="flex items-center text-slate-600 dark:text-zinc-400 cursor-grab active:cursor-grabbing hover:text-slate-600 dark:text-zinc-400 mt-1 md:mt-0 p-1 -ml-1 rounded hover:bg-slate-300/50 dark:hover:bg-white/10 transition-colors touch-none"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()} // Prevent selecting item when clicking grip
          >
            <GripVertical className="w-4 h-4 mr-1 lg:mr-2 pointer-events-none" />
            <span className="font-mono text-[10px] md:text-xs pointer-events-none">{String(originalIndex + 1).padStart(2, '0')}</span>
          </div>
          
          <div className="flex-1 cursor-pointer min-w-[150px]">
            <select
              value={item.service_label || 'Opening/Preparatory Song'}
              onChange={(e) => updateSetlist(item.id, { service_label: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className={cn("text-[10px] font-bold uppercase tracking-widest bg-transparent focus:outline-none mb-1 w-fit cursor-pointer appearance-none transition-colors", getLabelColor(item.service_label || 'Opening/Preparatory Song'))}
            >
              <option className="bg-white dark:bg-zinc-900 transition-colors" value="Opening/Preparatory Song">Opening/Preparatory Song</option>
              <option className="bg-white dark:bg-zinc-900 transition-colors" value="After Message/Worship song">After Message/Worship song</option>
              <option className="bg-white dark:bg-zinc-900 transition-colors" value="Offering Song">Offering Song</option>
              <option className="bg-white dark:bg-zinc-900 transition-colors" value="Special Offering Song">Special Offering Song</option>
              <option className="bg-white dark:bg-zinc-900 transition-colors" value="Communion Song">Communion Song</option>
              <option className="bg-white dark:bg-zinc-900 transition-colors" value="Special Number Song">Special Number Song</option>
              <option className="bg-white dark:bg-zinc-900 transition-colors" value="Worship">Worship</option>
            </select>
            <div className="flex items-center gap-2">
               <div className={cn("text-lg font-serif italic", isSelected ? "text-slate-900 dark:text-slate-100" : "text-slate-900 dark:text-white")}>{item.song.title}</div>
               {!hasMediaLink && (
                  <div title="This song won't play in the Rehearsal Playlist because it lacks any media URL." className="flex items-center justify-center text-amber-500/70">
                     <AlertCircle className="w-4 h-4" />
                  </div>
               )}
            </div>
          </div>

          <div className="text-right flex items-center gap-4 cursor-default" onClick={e => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentRehearsalIndex(originalIndex);
                setShowRehearsal(true);
              }}
              title="Play in Rehearsal Mode"
              className="hidden sm:flex items-center gap-1 bg-slate-800 dark:bg-white text-white dark:text-black px-2 py-1.5 rounded font-bold text-[10px] uppercase tracking-widest hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
            >
              <Play className="w-3 h-3" /> Play
            </button>
            
            <div className="text-right">
              <div className="flex items-center gap-1 bg-white/50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-white/10 px-1 py-0.5">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                    const currentIndex = CHROMATIC_SCALE.indexOf(item.target_key);
                    if (currentIndex !== -1) {
                      updateSetlist(item.id, { target_key: CHROMATIC_SCALE[(currentIndex - 1 + 12) % 12] });
                    }
                  }}
                  className="px-1 text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold"
                  title="Transpose Down"
                >-</button>
                <select 
                  value={item.target_key}
                  onChange={(e) => updateSetlist(item.id, { target_key: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent text-[10px] sm:text-xs text-center text-slate-700 dark:text-white font-bold focus:outline-none cursor-pointer w-12"
                >
                  <option className="bg-white dark:bg-zinc-900" value="Nashville">#</option>
                  {['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'].map((k: string) => (
                    <option className="bg-white dark:bg-zinc-900" key={k} value={k}>{k}</option>
                  ))}
                </select>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                    const currentIndex = CHROMATIC_SCALE.indexOf(item.target_key);
                    if (currentIndex !== -1) {
                      updateSetlist(item.id, { target_key: CHROMATIC_SCALE[(currentIndex + 1) % 12] });
                    }
                  }}
                  className="px-1 text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold"
                  title="Transpose Up"
                >+</button>
              </div>
              <div className="text-[10px] uppercase tracking-widest font-mono text-slate-500 dark:text-zinc-500 mt-1">{item.song.bpm} BPM</div>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); removeSetlist(item.id); }}
              className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-red-400 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isSelected && (
          <div className="border-t border-slate-300 dark:border-white/5 transition-colors bg-slate-100 dark:bg-black/40">
            <LiveTransposer song={item.song} targetKey={item.target_key} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetlistBuilder({ schedule }: { schedule: Schedule }) {
  const [setlist, setSetlist] = useState<SetlistSong[]>([]);
  const [rawSetlists, setRawSetlists] = useState<Setlist[]>([]);
  const [songsMap, setSongsMap] = useState<Map<string, Song>>(new Map());
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [showRehearsal, setShowRehearsal] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Listen to all songs
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'songs'), (snap) => {
      try {
        const smap = new Map<string, Song>();
        snap.docs.forEach(d => smap.set(d.id, { id: d.id, ...d.data() } as Song));
        setSongsMap(smap);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'songs');
      }
    });
    return () => unsub();
  }, []);

  // 2. Listen to setlists for this schedule
  useEffect(() => {
    const q = query(
      collection(db, 'setlists'), 
      where('schedule_id', '==', schedule.id),
      orderBy('sort_order', 'asc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      try {
        const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as Setlist));
        setRawSetlists(raw);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'setlists');
      }
    });
    
    return () => unsub();
  }, [schedule.id]);

  // 3. Join them
  useEffect(() => {
    const joined: SetlistSong[] = rawSetlists.map(sl => ({
      ...sl,
      song: songsMap.get(sl.song_id)!
    })).filter(sl => sl.song); // filter out deleted songs
    setSetlist(joined);
  }, [rawSetlists, songsMap]);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id && over) {
      const oldIndex = setlist.findIndex((item) => item.id === active.id);
      const newIndex = setlist.findIndex((item) => item.id === over.id);
      
      const newSetlist = arrayMove(setlist, oldIndex, newIndex);
      
      // Calculate new sort_orders
      newSetlist.forEach(async (item, index) => {
        try {
          await updateDoc(doc(db, 'setlists', item.id), { sort_order: index * 10 });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'setlists');
        }
      });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // Internal re-ordering

    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      
      const songInfo = JSON.parse(data) as Song;
      
      await addDoc(collection(db, 'setlists'), {
        schedule_id: schedule.id,
        song_id: songInfo.id,
        sort_order: setlist.length * 10,
        target_key: songInfo.original_key,
        createdAt: Date.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'setlists');
    }
  };

  
  const updateSetlist = async (id: string, updates: Partial<Setlist>) => {
    try {
      await updateDoc(doc(db, 'setlists', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `setlists/${id}`);
    }
  };

  const removeSetlist = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'setlists', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `setlists/${id}`);
    }
  };

  // Setlist Flow Analyzer
  const analyzeTransitions = (index: number) => {
    if (index === 0) return null;
    const current = setlist[index];
    const prev = setlist[index - 1];

    if (!current?.song || !prev?.song) return null;

    const warnings = [];
    const bpmDiff = Math.abs(current.song.bpm - prev.song.bpm);
    if (bpmDiff > 20) {
      warnings.push({ type: 'danger', msg: `Speed Drops/Jumps: ${bpmDiff} BPM difference` });
    }

    // Key Modulations... simplified check
    // If not same key, and not a 5th (7 semitones) or 4th (5 semitones), warn.
    const k1 = current.target_key;
    const k2 = prev.target_key;
    if (k1 !== k2) {
       // Deep logic for finding interval is possible via our CHROMATIC_SCALE 
       // but for UI sake, we just flag modulation.
       warnings.push({ type: 'warning', msg: `Modulation: ${k2} to ${k1}` });
    } else {
       warnings.push({ type: 'success', msg: 'Smooth Key Transition' });
    }

    return warnings;
  };

  const [currentRehearsalIndex, setCurrentRehearsalIndex] = useState(0);
  const [playerError, setPlayerError] = useState(false);

  useEffect(() => {
     setPlayerError(false);
  }, [currentRehearsalIndex]);

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
     if (showRehearsal) setIsPlaying(true);
  }, [showRehearsal]);

  const handleCloseRehearsal = () => {
      setIsPlaying(false);
      setTimeout(() => setShowRehearsal(false), 50);
  };

  const getYoutubeVideoId = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const content = url.trim();
    
    if (/^[\w-]{11}$/.test(content)) {
      return content;
    }
    const match = content.match(/(?:(?:music\.|www\.)?youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|v=|vi=|v\/|vi\/|shorts\/|live\/)([\w-]{11})/i);
    return match ? match[1] : null;
  };

  const getBestVideoId = (songInfo: Song) => {
     if (!songInfo) return null;
     return getYoutubeVideoId(songInfo.media_url) || getYoutubeVideoId(songInfo.instrumental_guide_guitar) || getYoutubeVideoId(songInfo.instrumental_guide_piano) || null;
  };

  const getBestUrl = (songInfo: Song) => {
     if (!songInfo) return null;
     return songInfo.media_url || songInfo.instrumental_guide_guitar || songInfo.instrumental_guide_piano || null;
  };

  const filteredSetlist = setlist.filter(item => 
    item.song.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.service_label && item.service_label.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <div className="flex items-baseline justify-between mb-8 mt-4 lg:mt-0">
        <h2 className="text-4xl font-serif italic text-slate-900 dark:text-white">
          Sunday Service <span className="text-sm font-sans not-italic text-slate-600 dark:text-zinc-400 ml-4">{schedule.service_date}</span>
        </h2>
        {setlist.length > 0 && (
          <button 
            onClick={() => { setCurrentRehearsalIndex(0); setShowRehearsal(true); }}
            className="flex items-center gap-2 text-[10px] border border-slate-300 dark:border-slate-700 bg-slate-900 dark:bg-slate-200 text-white dark:text-black px-3 py-1.5 rounded uppercase tracking-wider font-bold hover:bg-slate-800 dark:hover:bg-white transition-colors"
          >
            Play Setlist
          </button>
        )}
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-zinc-400" />
        <input 
          type="text" 
          placeholder="Search songs in setlist..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-200 dark:bg-white/5 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
        />
      </div>

      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex-1 relative space-y-2 transition-all duration-200 rounded-lg min-h-[10rem] pb-8",
          isDragOver ? "bg-slate-200/50 dark:bg-white/5 ring-2 ring-indigo-400 dark:ring-indigo-500 ring-inset" : "",
          filteredSetlist.length === 0 ? "flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-white/10 py-12" : "border-2 border-transparent"
        )}
      >
        {filteredSetlist.length === 0 && !isDragOver && (
          <p className="text-slate-600 dark:text-zinc-400 text-sm font-medium">
            {searchTerm ? "No songs match your search." : "Drag and drop songs from the repository here."}
          </p>
        )}

        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
        >
          <SortableContext 
            items={filteredSetlist.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {filteredSetlist.map((item) => {
              const originalIndex = setlist.findIndex(s => s.id === item.id);
              const transitions = analyzeTransitions(originalIndex);
              const isSelected = activeSongId === item.id;
              
              return (
                <SortableSetlistItem
                  key={item.id}
                  item={item}
                  originalIndex={originalIndex}
                  isSelected={isSelected}
                  setActiveSongId={setActiveSongId}
                  updateSetlist={updateSetlist}
                  removeSetlist={removeSetlist}
                  setCurrentRehearsalIndex={setCurrentRehearsalIndex}
                  setShowRehearsal={setShowRehearsal}
                  transitions={transitions}
                  getBestUrl={getBestUrl}
                  getLabelColor={getLabelColor}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {showRehearsal && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col md:flex-row">
            <div className="flex-1 flex flex-col items-center justify-center relative bg-black p-4 md:p-8">
                <button onClick={handleCloseRehearsal} className="absolute top-4 right-4 text-white hover:text-red-400 z-10 bg-white/10 p-2 rounded-full"><X className="w-5 h-5"/></button>
                
               <div className="w-full max-w-4xl aspect-video bg-zinc-900 rounded-xl overflow-hidden shadow-2xl relative">
                   <div className={(!getBestUrl(setlist[currentRehearsalIndex]?.song) || playerError) ? "hidden" : "absolute inset-0"}>
                       {getBestVideoId(setlist[currentRehearsalIndex]?.song) ? (
                          <iframe
                            className="absolute top-0 left-0 w-full h-full border-0"
                            src={`https://www.youtube.com/embed/${getBestVideoId(setlist[currentRehearsalIndex]?.song)}${isPlaying ? '?autoplay=1' : ''}`}
                            title="Media Guide"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                       ) : getBestUrl(setlist[currentRehearsalIndex]?.song)?.startsWith('http') ? (
                          <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center">
                             <a 
                                href={getBestUrl(setlist[currentRehearsalIndex]?.song) as string}
                                target="_blank" rel="noreferrer"
                                className="bg-zinc-800 text-white px-6 py-3 rounded-lg hover:bg-zinc-700 font-bold transition flex items-center gap-2 border border-zinc-700"
                             >
                                Open Media Link
                             </a>
                             <p className="text-sm text-zinc-500">This link format cannot be embedded directly. Click above to open it in a new tab.</p>
                             <button 
                                onClick={() => {
                                   if (currentRehearsalIndex < setlist.length - 1) setCurrentRehearsalIndex(p => p + 1);
                                }} 
                                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500 font-medium mt-4"
                             >
                                Skip to Next
                             </button>
                          </div>
                       ) : (
                          <div className="flex flex-col items-center justify-center h-full space-y-4">
                             <a 
                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(getBestUrl(setlist[currentRehearsalIndex]?.song) || '')}`}
                                target="_blank" rel="noreferrer"
                                className="bg-red-600/20 text-red-500 font-bold border border-red-500/30 px-6 py-3 rounded-lg hover:bg-red-600/40 transition flex items-center gap-2"
                             >
                                <Play className="w-5 h-5" /> Search YouTube for this song
                             </a>
                             <p className="text-sm text-zinc-500">The provided media guide is a title, not a direct link.</p>
                             <button 
                                onClick={() => {
                                   if (currentRehearsalIndex < setlist.length - 1) setCurrentRehearsalIndex(p => p + 1);
                                }} 
                                className="bg-zinc-800 text-white px-4 py-2 rounded hover:bg-zinc-700 font-medium"
                             >
                                Skip to Next
                             </button>
                          </div>
                       )}
                       {getBestVideoId(setlist[currentRehearsalIndex]?.song) && (
                          <div className="absolute top-2 left-2 z-20">
                             <a href={`https://youtube.com/watch?v=${getBestVideoId(setlist[currentRehearsalIndex]?.song)}`} target="_blank" rel="noreferrer" className="text-[10px] bg-black/60 text-white/50 hover:text-white px-2 py-1 rounded backdrop-blur transition truncate max-w-[200px] block border border-white/10 opacity-0 hover:opacity-100" title="Open Media URL">
                               Open in YouTube
                             </a>
                          </div>
                       )}
                   </div>

                   {getBestUrl(setlist[currentRehearsalIndex]?.song) && playerError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10 bg-zinc-900 border border-red-500/20">
                         <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                         <p className="text-white text-lg font-bold mb-2">Media Cannot Be Played Here</p>
                         <p className="text-zinc-400 text-sm mb-6">The media format cannot be embedded directly, or the link is invalid.</p>
                         <div className="flex gap-4">
                            <a 
                               href={getBestUrl(setlist[currentRehearsalIndex]?.song) as string} 
                               target="_blank" rel="noreferrer"
                               className="bg-zinc-800 text-white px-4 py-2 rounded font-bold hover:bg-zinc-700 transition"
                            >
                               Open Link in New Tab
                            </a>
                            <button 
                               onClick={() => {
                                  if (currentRehearsalIndex < setlist.length - 1) setCurrentRehearsalIndex(p => p + 1);
                               }} 
                               className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-500"
                            >
                               Skip to Next
                            </button>
                         </div>
                      </div>
                   )}

                   {!getBestUrl(setlist[currentRehearsalIndex]?.song) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-900 z-10">
                         <p className="text-white text-lg font-bold mb-2">No audio/video link provided</p>
                         <p className="text-zinc-400 text-sm mb-6">This song doesn't have a media guide attached.</p>
                         <button 
                            onClick={() => {
                               if (currentRehearsalIndex < setlist.length - 1) setCurrentRehearsalIndex(p => p + 1);
                            }} 
                            className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-500"
                         >
                            Skip to Next
                         </button>
                      </div>
                   )}
                </div>

                <div className="mt-8 flex items-center justify-between w-full max-w-4xl px-4">
                    <div>
                        <h3 className="text-white text-xl font-bold">{setlist[currentRehearsalIndex]?.song?.title}</h3>
                        <p className="text-zinc-400 text-sm">{setlist[currentRehearsalIndex]?.song?.artist}</p>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setCurrentRehearsalIndex(p => p - 1)} 
                            disabled={currentRehearsalIndex === 0} 
                            className="text-white disabled:opacity-30"
                        >
                            Previous
                        </button>
                        <button 
                            onClick={() => setCurrentRehearsalIndex(p => p + 1)} 
                            disabled={currentRehearsalIndex === setlist.length - 1} 
                            className="text-white disabled:opacity-30"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-80 lg:w-[400px] h-64 md:h-full bg-zinc-900 border-l border-zinc-800 overflow-y-auto">
               <div className="p-4 sticky top-0 bg-zinc-900/90 backdrop-blur border-b border-zinc-800">
                  <h2 className="text-white font-bold uppercase tracking-wider text-sm">Up Next</h2>
               </div>
               <div className="p-2 space-y-1">
                  {setlist.map((item, i) => (
                     <button 
                         key={item.id} 
                         onClick={() => setCurrentRehearsalIndex(i)}
                         className={cn(
                             "w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors border",
                             currentRehearsalIndex === i ? "bg-indigo-600 border-indigo-500 shadow-md" : "border-transparent hover:bg-white/5"
                         )}
                     >
                        <div className={cn("text-xs font-mono mt-1 w-5 flex-shrink-0 text-center", currentRehearsalIndex === i ? "text-indigo-200" : "text-zinc-500")}>
                           {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className={cn("truncate font-medium", currentRehearsalIndex === i ? "text-white" : "text-zinc-200")}>{item.song.title}</div>
                           <div className={cn("text-xs truncate", currentRehearsalIndex === i ? "text-indigo-200" : "text-zinc-500")}>{item.song.artist}</div>
                           {!getBestUrl(item.song) && i !== currentRehearsalIndex && (
                               <div className="text-[10px] text-red-400 mt-1 uppercase tracking-wider font-bold">No Media</div>
                           )}
                        </div>
                     </button>
                  ))}
               </div>
            </div>
        </div>
      )}
    </>
  );
}
