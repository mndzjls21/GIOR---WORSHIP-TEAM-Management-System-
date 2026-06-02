import React, { useState, useEffect } from 'react';
import { Song } from '../types';
import { transposeChord } from '../lib/utils';
import { cn } from '../lib/utils';
import { Play, Pause, Activity } from 'lucide-react';

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

export default function LiveTransposer({ song, targetKey }: { song: Song, targetKey: string }) {
  const [textSize, setTextSize] = useState(24); // 24px default (text-2xl)
  const [isPlayingMetronome, setIsPlayingMetronome] = useState(false);
  const [metronomeFlash, setMetronomeFlash] = useState(false);

  useEffect(() => {
    let metronomeInterval: NodeJS.Timeout;
    let flashTimeout: NodeJS.Timeout;
    
    if (isPlayingMetronome && song?.bpm) {
      const msPerBeat = 60000 / song.bpm;
      metronomeInterval = setInterval(() => {
        setMetronomeFlash(true);
        flashTimeout = setTimeout(() => {
          setMetronomeFlash(false);
        }, 100);
      }, msPerBeat);
    }
    
    return () => {
      clearInterval(metronomeInterval);
      clearTimeout(flashTimeout);
      setMetronomeFlash(false);
    };
  }, [isPlayingMetronome, song?.bpm]);

  // Render lyrics block, parsing bracketed chords dynamically
  const renderLyrics = (text: string) => {
    const lines = text.split('\n');
    
    const CHORD_REGEX = /^[A-G][#b]?(m|min|maj|M|dim|aug|sus|add|o)?\d*(\(?(sus|add|#|b)\d+\)?)*(\/[A-G][#b]?)?$/;

    return lines.map((line, lineIdx) => {
      // If line is empty, return a break
      if (!line.trim()) return <div key={lineIdx} className="h-6"></div>;

      const hasBracketChords = /\[(.*?)\]/.test(line);

      const isPlainChordLine = () => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        // Exclude lines with standard punctuation (except slashes and parentheses used in chords)
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
          <div key={lineIdx} className="relative min-h-[2rem] text-slate-900 dark:text-white" style={{ fontSize: `${textSize}px` }}>
            {line}
          </div>
        );
      }

      if (plainChords) {
        // Split by whitespace preserving the space tokens
        const tokens = line.split(/(\s+)/);
        const resolved = tokens.map((token) => {
          if (token.trim() === '') return token;
          return transposeChord(token, song.original_key, targetKey);
        }).join('');

        return (
          <div key={lineIdx} className="relative min-h-[2rem] font-sans font-bold text-blue-700 dark:text-blue-400" style={{ fontSize: `${textSize * 0.8}px` }}>
            <span className="whitespace-pre">{resolved}</span>
          </div>
        );
      }

      // Bracket Chords Handling
      const parsedElements = [];
      let lastIndex = 0;
      const regex = /\[(.*?)\]/g;
      let regexMatch;
      
      while ((regexMatch = regex.exec(line)) !== null) {
        const textBefore = line.substring(lastIndex, regexMatch.index);
        const chord = transposeChord(regexMatch[1], song.original_key, targetKey);
        
        parsedElements.push(
          <span key={`group-${regexMatch.index}`} className="relative inline-flex flex-col items-start leading-relaxed">
            <span className="font-sans text-sm font-bold absolute -top-5 text-blue-700 dark:text-blue-400">[{chord}]</span>
            <span className="whitespace-pre text-slate-900 dark:text-white" style={{ fontSize: `${textSize}px` }}>{textBefore === '' ? '\u200B' : textBefore}</span>
          </span>
        );
        lastIndex = regexMatch.index + regexMatch[0].length;
      }
      
      const trailingText = line.substring(lastIndex);
      if (trailingText) {
         parsedElements.push(
           <span key="trailing" className="leading-relaxed whitespace-pre text-slate-900 dark:text-white" style={{ fontSize: `${textSize}px` }}>{trailingText}</span>
         );
      }

      return (
        <div key={lineIdx} className="flex flex-wrap items-end min-h-[3.5rem] mt-4">
          {parsedElements}
        </div>
      );
    });
  };

  const hasAnyVideo = song.media_url || song.instrumental_guide_guitar || song.instrumental_guide_piano;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black/60 transition-colors">
      <div className="p-4 flex flex-wrap items-center gap-4 border-b w-full border-slate-200 dark:border-white/10 transition-colors bg-slate-50 dark:bg-zinc-950">
        <div className="flex gap-2">
          <button onClick={() => setTextSize(s => Math.max(16, s - 2))} className="px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors bg-slate-200 dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-white/10">Text Size -</button>
          <button onClick={() => setTextSize(s => Math.min(48, s + 2))} className="px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors bg-slate-200 dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-white/10">Text Size +</button>
        </div>

        <div className="hidden sm:block w-[1px] h-6 bg-slate-300 dark:bg-white/10 mx-2"></div>

        <button 
          onClick={() => setIsPlayingMetronome(!isPlayingMetronome)} 
          className={cn("p-2 rounded border border-slate-300 dark:border-white/10 transition-colors flex items-center gap-2 px-3 font-bold uppercase tracking-widest text-[10px]", isPlayingMetronome ? "bg-amber-100 dark:bg-amber-900/40 border-amber-300 text-amber-600 dark:text-amber-400" : "bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-white/10")} 
          title="Metronome"
        >
          <Activity className={cn("w-4 h-4", metronomeFlash && "opacity-30")} />
          <span>Metronome</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div 
          className={cn(
            "flex-1 p-8 font-serif overflow-y-auto relative h-full transition-shadow duration-100",
            metronomeFlash && "shadow-[inset_0_0_0_2px_rgba(251,191,36,0.5)]"
          )}
        >
          <div className="absolute inset-x-0 top-0 h-8 pointer-events-none bg-gradient-to-b from-white via-white dark:from-[#0d0d0d] dark:via-[#0d0d0d] to-transparent z-10 transition-colors"></div>
          
          <div className="space-y-4 leading-relaxed pb-12 relative z-10 w-full font-medium">
            {renderLyrics(song.lyrics_chords)}
          </div>
        </div>

        {hasAnyVideo && (
          <div className="w-full lg:w-96 p-8 overflow-y-auto border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/10 shrink-0 bg-slate-50 dark:bg-white/5 transition-colors">
            <div className="flex flex-col gap-6">
              {song.media_url && <YouTubeEmbed url={song.media_url} label="Media / Reference" />}
              {song.instrumental_guide_guitar && <YouTubeEmbed url={song.instrumental_guide_guitar} label="Guitar Guide" />}
              {song.instrumental_guide_piano && <YouTubeEmbed url={song.instrumental_guide_piano} label="Piano Guide" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
