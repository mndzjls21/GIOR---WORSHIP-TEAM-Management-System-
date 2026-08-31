import * as fs from 'fs';

let content = fs.readFileSync('src/components/SetlistBuilder.tsx', 'utf-8');

const imports = `import {
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
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';`;

content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\n" + imports);

const sortableItemComp = `
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
    <div ref={setNodeRef} style={style} className="mb-2 touch-none sm:touch-auto">
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
            className="flex items-center text-slate-600 dark:text-zinc-400 cursor-grab active:cursor-grabbing hover:text-slate-600 dark:text-zinc-400 mt-1 md:mt-0 p-1 -ml-1 rounded hover:bg-slate-300/50 dark:hover:bg-white/10 transition-colors"
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

export default function SetlistBuilder`;

content = content.replace('export default function SetlistBuilder', sortableItemComp);

const sensorsAndDragEnd = `
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

  const handleDrop = async (e: React.DragEvent) => {`;

content = content.replace("  const handleDrop = async (e: React.DragEvent) => {", sensorsAndDragEnd);

const replaceDndKitBlock = `<DndContext 
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
        </DndContext>`;

const startIdx = content.indexOf('{filteredSetlist.map((item) => {');
const endIdx = content.indexOf('</div>', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
    const originalBlock = content.substring(startIdx, endIdx);
    
    // Make sure we capture everything correctly
    // Since there are multiple React.Fragment, etc inside
    // let's just do a regex replace or slice
    
    // Let's find the closing tag for the fragment loop
    const loopEnd = content.indexOf('</React.Fragment>', startIdx);
    if (loopEnd !== -1) {
        // plus some more chars to capture the closing brace of the map
        const endOfMap = content.indexOf('})}', loopEnd) + 3;
        content = content.substring(0, startIdx) + replaceDndKitBlock + content.substring(endOfMap);
    }
}

// Remove old drag handlers
content = content.replace(/const handleRowDragStart = [\s\S]*?const handleRowDrop = [\s\S]*?}\n  };\n/, '');

fs.writeFileSync('src/components/SetlistBuilder.tsx', content);
