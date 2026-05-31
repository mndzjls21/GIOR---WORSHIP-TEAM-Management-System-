import React, { useState, useEffect } from 'react';
import { Song } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Search, Plus, Trash2, Library, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { transposeChord } from '../lib/utils';

export default function SongLibrary({ scheduleId }: { scheduleId: string }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState('');
  const [editingSong, setEditingSong] = useState<Song | null | 'new'>(null);
  const [groupBy, setGroupBy] = useState<'none' | 'artist' | 'tags' | 'language'>('none');

  useEffect(() => {
    const q = query(collection(db, 'songs'), orderBy('title', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Song)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'songs'));
    return () => unsub();
  }, []);

  const handleDragStart = (e: React.DragEvent, song: Song) => {
    e.dataTransfer.setData('application/json', JSON.stringify(song));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const filtered = songs.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.artist.toLowerCase().includes(search.toLowerCase()) ||
    s.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const groupedSongs = React.useMemo(() => {
    if (groupBy === 'none') return { 'All Songs': filtered };
    const groups: Record<string, Song[]> = {};
    
    if (groupBy === 'artist') {
      filtered.forEach(s => {
         const key = s.artist ? s.artist.trim() : 'Unknown Artist';
         if (!groups[key]) groups[key] = [];
         groups[key].push(s);
      });
    } else if (groupBy === 'tags') {
      filtered.forEach(s => {
         if (!s.tags || s.tags.length === 0) {
           if (!groups['Uncategorized']) groups['Uncategorized'] = [];
           groups['Uncategorized'].push(s);
         } else {
           s.tags.forEach(t => {
             const key = t.trim();
             if (!groups[key]) groups[key] = [];
             groups[key].push(s);
           });
         }
      });
    } else if (groupBy === 'language') {
      filtered.forEach(s => {
         const key = s.language ? s.language.trim() : 'Unknown';
         if (!groups[key]) groups[key] = [];
         groups[key].push(s);
      });
    }
    
    // Sort groups alphabetically
    const sortedKeys = Object.keys(groups).sort((a, b) => {
       if (a === 'Uncategorized') return 1;
       if (b === 'Uncategorized') return -1;
       return a.localeCompare(b);
    });
    
    const sortedGroups: Record<string, Song[]> = {};
    for (const key of sortedKeys) {
      sortedGroups[key] = groups[key];
    }
    return sortedGroups;
  }, [filtered, groupBy]);

  return (
    <>
      <div className="p-6 border-b border-slate-300 dark:border-white/5 transition-colors flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-600 dark:text-zinc-400">Song Repository</h3>
          <div className="flex items-center gap-2">
            <select 
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="text-[10px] bg-transparent border border-slate-300 dark:border-white/10 text-slate-600 dark:text-zinc-400 px-2 py-1.5 rounded outline-none focus:border-slate-400 dark:focus:border-slate-500 cursor-pointer"
            >
              <option value="none" className="bg-slate-100 dark:bg-zinc-900 border-none outline-none">Alphabetical</option>
              <option value="artist" className="bg-slate-100 dark:bg-zinc-900 border-none outline-none">By Artist</option>
              <option value="tags" className="bg-slate-100 dark:bg-zinc-900 border-none outline-none">By Tags</option>
              <option value="language" className="bg-slate-100 dark:bg-zinc-900 border-none outline-none">By Language</option>
            </select>
            <button 
              onClick={() => setEditingSong('new')}
              className="text-[10px] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:text-slate-100 transition-colors uppercase tracking-widest border border-slate-300 dark:border-white/10 transition-colors px-2 py-1.5 rounded flex items-center"
              title="Add New Song"
            >
              <Plus className="w-3 h-3 mr-1" /> Add
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search by title, artist, or tags..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
        {Object.entries(groupedSongs).map(([groupName, groupSongs]) => (
          <div key={groupName} className="space-y-1">
            {groupBy !== 'none' && (
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500 pl-3 mb-2 mt-4 first:mt-0 sticky top-0 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-md py-1 z-10 border-b border-transparent dark:border-white/5 shadow-[0_4px_10px_rgba(0,0,0,0.4)] md:shadow-none font-sans">
                {groupName}
              </h4>
            )}
            {groupSongs.map(song => (
              <div 
                key={song.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, song)}
                onClick={() => setEditingSong(song)}
                className="group py-2 px-3 hover:bg-slate-200 dark:bg-white/5 transition-colors border-l-2 border-transparent hover:border-slate-300 dark:border-slate-700 transition-colors cursor-grab active:cursor-grabbing transition-all relative"
              >
                <div className="flex justify-between items-start">
                  <div className="pr-12">
                      <h3 className="font-medium text-slate-900 dark:text-white text-sm group-hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer flex items-center gap-2">
                       {song.title}
                       {song.language && (
                         <span className={cn("text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest font-bold",
                           song.language === 'English' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                           song.language === 'Tagalog' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                           song.language === 'Taglish' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                           song.language === 'Instrumental' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                           'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-500'
                         )}>
                           {song.language}
                         </span>
                       )}
                     </h3>
                     <p className="text-[10px] text-slate-600 dark:text-zinc-400 mt-0.5 uppercase tracking-wider">{song.artist}</p>
                  </div>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 border border-slate-300 dark:border-white/10 transition-colors text-slate-600 dark:text-zinc-400 rounded mt-0.5 whitespace-nowrap">
                    {song.original_key} • {song.bpm}
                  </span>
                </div>
                {song.tags && song.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {song.tags.map(t => (
                      <span key={t} className="text-[8px] uppercase tracking-widest px-1 py-0.5 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-white/5 transition-colors rounded-sm">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'songs', song.id)); }}
                    className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-red-400 hover:bg-slate-100 dark:hover:bg-red-400/10 rounded border border-slate-200 dark:border-white/10 bg-white shadow-sm dark:bg-[#1e1e1e] transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center p-6 text-slate-600 dark:text-zinc-400 text-xs italic">
            No songs found.
          </div>
        )}
      </div>

      {editingSong && <SongEditorModal song={editingSong === 'new' ? null : editingSong} onClose={() => setEditingSong(null)} />}
    </>
  );
}

function YouTubeEmbed({ url, label }: { url: string, label: string }) {
  if (!url) return null;
  const match = url.match(/(?:(?:v|vi|be|videos|embed)\/|v=|\/v\/|youtu\.be\/|\/e\/)([0-9A-Za-z_-]{11})/);
  const videoId = match ? match[1] : null;

  return (
    <div className="mt-4">
      <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-zinc-400 block mb-2">{label}</span>
      {videoId ? (
        <div className="relative w-full aspect-video rounded overflow-hidden border border-slate-300 dark:border-white/10">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline text-xs break-all">
          {url}
        </a>
      )}
    </div>
  );
}

function SongEditorModal({ song, onClose }: { song: Song | null; onClose: () => void }) {
  const [isEditing, setIsEditing] = useState(!song);
  
  const [title, setTitle] = useState(song?.title || '');
  const [artist, setArtist] = useState(song?.artist || '');
  const [key, setKey] = useState(song?.original_key || 'C');
  const [bpm, setBpm] = useState(song?.bpm ? String(song.bpm) : '120');
  const [tags, setTags] = useState(song?.tags?.join(', ') || '');
  const [language, setLanguage] = useState(song?.language || '');
  const [lyrics, setLyrics] = useState(song?.lyrics_chords || '');
  const [media, setMedia] = useState(song?.media_url || '');
  const [instrumentalGuitar, setInstrumentalGuitar] = useState(song?.instrumental_guide_guitar || '');
  const [instrumentalPiano, setInstrumentalPiano] = useState(song?.instrumental_guide_piano || '');

  const hasAnyVideo = song?.media_url || song?.instrumental_guide_guitar || song?.instrumental_guide_piano;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      const payload: any = {
        title,
        artist,
        original_key: key,
        bpm: Number(bpm),
        language,
        lyrics_chords: lyrics,
      };
      
      if (parsedTags.length > 0) {
        payload.tags = parsedTags;
      } else {
        payload.tags = [];
      }
      
      if (media.trim()) {
        payload.media_url = media.trim();
      } else {
        payload.media_url = '';
      }

      if (instrumentalGuitar.trim()) {
        payload.instrumental_guide_guitar = instrumentalGuitar.trim();
      } else {
        payload.instrumental_guide_guitar = '';
      }

      if (instrumentalPiano.trim()) {
        payload.instrumental_guide_piano = instrumentalPiano.trim();
      } else {
        payload.instrumental_guide_piano = '';
      }

      if (song) {
        await updateDoc(doc(db, 'songs', song.id), payload);
      } else {
        payload.createdAt = Date.now();
        await addDoc(collection(db, 'songs'), payload);
      }
      onClose();
    } catch (err) {
      handleFirestoreError(err, song ? OperationType.UPDATE : OperationType.CREATE, 'songs');
    }
  };

  const renderViewer = () => {
    const CHORD_REGEX = /^[A-G][#b]?(m|min|maj|M|dim|aug|sus|add|o)?\d*(\(?(sus|add|#|b)\d+\)?)*(\/[A-G][#b]?)?$/;

    return (
      <div className="flex flex-col gap-6 font-sans">
        <div className="flex justify-between items-start border-b border-slate-300 dark:border-white/10 transition-colors pb-4">
          <div>
            <h2 className="text-3xl font-serif italic text-slate-900 dark:text-white mb-1">{song?.title}</h2>
            <div className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100 mb-3">{song?.artist}</div>
            <div className="flex gap-4 text-xs text-slate-600 dark:text-zinc-400 uppercase tracking-widest">
              <span>Key: <span className="text-slate-900 dark:text-white">{song?.original_key}</span></span>
              <span>BPM: <span className="text-slate-900 dark:text-white">{song?.bpm}</span></span>
              {song?.language && <span>Language: <span className="text-slate-900 dark:text-white">{song.language}</span></span>}
            </div>
            {song?.tags && song.tags.length > 0 && (
              <div className="flex gap-2 mt-4">
                {song.tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-slate-200 dark:bg-white/5 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-2 py-1 text-slate-600 dark:text-zinc-400 uppercase tracking-widest">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 border border-slate-300 dark:border-white/10 transition-colors px-3 py-1.5 rounded text-xs uppercase text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-white/5 transition-colors">
            <Edit2 className="w-3 h-3" />
            Edit
          </button>
        </div>

        <div className={cn("grid gap-6 max-h-[50vh] overflow-y-auto", hasAnyVideo ? "md:grid-cols-2" : "grid-cols-1")}>
          <div className="bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/5 transition-colors p-6 rounded-lg text-left h-max">
            {song?.lyrics_chords.split('\n').map((line, lineIdx) => {
              if (!line.trim()) {
                return <div key={lineIdx} className="h-6" />;
              }
              
              const hasBracketChords = /\[(.*?)\]/.test(line);

              const isPlainChordLine = () => {
                const trimmed = line.trim();
                if (!trimmed) return false;
                if (/[.,!?;:]/.test(trimmed)) return false;
                
                const tokens = trimmed.split(/\s+/);
                for (const token of tokens) {
                  if (!CHORD_REGEX.test(token)) {
                    return false;
                  }
                }
                return true;
              };

              const plainChords = !hasBracketChords && isPlainChordLine();

              if (!hasBracketChords && !plainChords) {
                return (
                  <div key={lineIdx} className="text-slate-900 dark:text-white text-sm mb-1 leading-relaxed">
                    {line}
                  </div>
                );
              }

              if (plainChords) {
                return (
                  <div key={lineIdx} className="text-slate-900 dark:text-slate-100 font-bold font-sans text-xs whitespace-pre mb-1">
                    {line}
                  </div>
                );
              }

              const parsedElements = [];
              let lastIndex = 0;
              const regex = /\[(.*?)\]/g;
              let match;

              while ((match = regex.exec(line)) !== null) {
                const textBefore = line.substring(lastIndex, match.index);
                const originalChord = match[1];

                if (textBefore) {
                  parsedElements.push(
                    <span key={`text-${lastIndex}`} className="text-slate-900 dark:text-white text-sm leading-relaxed">{textBefore}</span>
                  );
                }

                parsedElements.push(
                  <span key={`chord-${match.index}`} className="relative inline-flex flex-col items-center justify-end group/chord leading-none mx-[1px]">
                    <span className="text-slate-900 dark:text-slate-100 font-bold text-[11px] leading-none mb-1 font-sans">
                      {originalChord}
                    </span>
                  </span>
                );

                lastIndex = regex.lastIndex;
              }

              const textAfter = line.substring(lastIndex);
              if (textAfter) {
                parsedElements.push(
                  <span key={`text-${lastIndex}`} className="text-slate-900 dark:text-white text-sm leading-relaxed">{textAfter}</span>
                );
              }

              return (
                <div key={lineIdx} className="relative min-h-[3rem] pt-3 flex items-end mb-1">
                  <div className="flex items-end">{parsedElements}</div>
                </div>
              );
            })}
          </div>

          {hasAnyVideo && (
            <div className="flex flex-col gap-6 w-full">
              {song?.media_url && <YouTubeEmbed url={song.media_url} label="Media / Reference" />}
              {song?.instrumental_guide_guitar && <YouTubeEmbed url={song.instrumental_guide_guitar} label="Guitar Guide" />}
              {song?.instrumental_guide_piano && <YouTubeEmbed url={song.instrumental_guide_piano} label="Piano Guide" />}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 transition-colors backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={cn("bg-white dark:bg-zinc-900 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded-lg w-full max-h-[90vh] shadow-2xl flex flex-col font-sans", !isEditing && hasAnyVideo ? "max-w-5xl" : "max-w-2xl")}>
        <div className="p-4 border-b border-slate-300 dark:border-white/10 transition-colors flex justify-between items-center">
          <h2 className="text-sm uppercase tracking-widest font-bold text-slate-900 dark:text-slate-100">
            {isEditing ? (song ? 'Edit Song' : 'Add to Repository') : 'Song Viewer'}
          </h2>
          <button onClick={onClose} className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:text-white">✕</button>
        </div>
        
        {isEditing ? (
          <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-6 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-2">Title *</label>
                <input required value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-2">Artist *</label>
                <input required value={artist} onChange={e=>setArtist(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-2">Original Key *</label>
                <input required value={key} onChange={e=>setKey(e.target.value)} placeholder="e.g. G" className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-2">BPM *</label>
                <input required type="number" value={bpm} onChange={e=>setBpm(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-2">Language</label>
                <select required value={language} onChange={e=>setLanguage(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors">
                  <option value="" disabled>Select Language</option>
                  <option value="English">English</option>
                  <option value="Tagalog">Tagalog</option>
                  <option value="Taglish">Taglish</option>
                  <option value="Instrumental">Instrumental</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-2">Tags (comma separated)</label>
                <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Fast, Opening, Communion" className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-2">YouTube / Media URL</label>
              <input type="url" value={media} onChange={e=>setMedia(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-2">Instrumental Guide (Guitar) URL</label>
              <input type="url" value={instrumentalGuitar} onChange={e=>setInstrumentalGuitar(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-2">Instrumental Guide (Piano) URL</label>
              <input type="url" value={instrumentalPiano} onChange={e=>setInstrumentalPiano(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-400 mb-2">Lyrics & Chords * (Use [brackets] for chords)</label>
              <p className="text-[10px] text-slate-600 dark:text-zinc-400 mb-2 italic">Example: [G]Amazing grace how [C]sweet the [G]sound</p>
              <textarea required rows={8} value={lyrics} onChange={e=>setLyrics(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-950 transition-colors border border-slate-300 dark:border-white/10 transition-colors rounded px-3 py-2 text-sm text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors" />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              {song && (
                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 rounded text-xs uppercase tracking-widest font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:text-white transition-colors">
                  Cancel
                </button>
              )}
              <button type="submit" className="bg-slate-800 dark:bg-slate-200 text-white dark:text-black hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors px-6 py-2 rounded text-xs uppercase tracking-widest font-bold transition-colors">
                Save Let it Be Written
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 flex-1 overflow-hidden">
            {renderViewer()}
          </div>
        )}
      </div>
    </div>
  );
}

