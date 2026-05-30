import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Live Chord Transposer Engine Math
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const CHROMATIC_SCALE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function normalizeNote(note: string): string {
  // Normalize sharp/flat representations to our base array to find index easily
  // Though our array blends them, let's make a solid map
  const map: Record<string, string> = {
    'C': 'C', 'B#': 'C', 'C#': 'C#', 'Db': 'C#',
    'D': 'D', 'D#': 'Eb', 'Eb': 'Eb',
    'E': 'E', 'Fb': 'E', 'F': 'F', 'E#': 'F',
    'F#': 'F#', 'Gb': 'F#',
    'G': 'G', 'G#': 'Ab', 'Ab': 'Ab',
    'A': 'A', 'A#': 'Bb', 'Bb': 'Bb',
    'B': 'B', 'Cb': 'B'
  };
  return map[note] || note;
}

const NASHVILLE_DEGREES = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];

export function transposeChord(chord: string, originalKey: string, targetKey: string): string {
  if (!originalKey || !targetKey) return chord;
  
  const cleanOriginal = originalKey.trim();
  const cleanTarget = targetKey.trim();
  
  if (cleanOriginal === cleanTarget && cleanTarget !== 'Nashville') return chord;
  
  const normOriginal = normalizeNote(cleanOriginal);
  const idxOriginal = CHROMATIC_SCALE.indexOf(normOriginal);
  if (idxOriginal === -1) return chord;

  const isNashville = cleanTarget === 'Nashville';

  let delta = 0;
  let useFlats = false;

  if (!isNashville) {
    const normTarget = normalizeNote(cleanTarget);
    const idxTarget = CHROMATIC_SCALE.indexOf(normTarget);
    if (idxTarget === -1) return chord;
    delta = idxTarget - idxOriginal;
    useFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'd', 'g', 'c', 'f', 'bb', 'eb'].includes(cleanTarget);
  }

  // Split by slash to handle bass notes (e.g., D/F#)
  const parts = chord.split('/');
  
  const transposedParts = parts.map(part => {
    const match = part.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return part;
    
    let root = match[1];
    let suffix = match[2];
    
    const normRoot = normalizeNote(root);
    const idxRoot = CHROMATIC_SCALE.indexOf(normRoot);
    if (idxRoot === -1) return part;
    
    let interval = (idxRoot - idxOriginal) % 12;
    if (interval < 0) interval += 12;

    if (isNashville) {
      if (suffix.startsWith('m') && !suffix.startsWith('maj')) {
          // If it's a minor chord, typically Nashville adds a minus sign or 'm'
          // We'll use 'm' for minor to keep it readable, e.g. 6m
          // The suffix already starts with 'm', so just map root to degree
      }
      return NASHVILLE_DEGREES[interval] + suffix;
    } else {
      let newIdx = (idxOriginal + interval + delta) % 12;
      if (newIdx < 0) newIdx += 12;
      let newRoot = useFlats ? NOTES_FLAT[newIdx] : NOTES_SHARP[newIdx];
      return newRoot + suffix;
    }
  });
  
  return transposedParts.join('/');
}

export function transposeLyrics(lyrics: string, originalKey: string, targetKey: string): string {
  if (!lyrics) return '';
  return lyrics.replace(/\[(.*?)\]/g, (match, chord) => {
    return `[${transposeChord(chord, originalKey, targetKey)}]`;
  });
}
