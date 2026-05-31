export interface Song {
  id: string;
  title: string;
  artist: string;
  original_key: string;
  bpm: number;
  tags: string[];
  language?: string;
  lyrics_chords: string;
  media_url?: string;
  instrumental_guide_guitar?: string;
  instrumental_guide_piano?: string;
  createdAt: number;
}

export interface Schedule {
  id: string;
  service_date: string; // YYYY-MM-DD
  notes?: string;
  presider?: string;
  worship_leader?: string;
  lead_guitar?: string;
  acoustic_guitar?: string;
  bassist?: string;
  keyboardist?: string;
  drummer?: string;
  backup_vocals?: string;
  projectionist?: string;
  livestreamer?: string;
  photographer?: string;
  mixer?: string;
  createdAt: number;
}

export interface Setlist {
  id: string;
  schedule_id: string;
  song_id: string;
  sort_order: number;
  service_label?: string;
  target_key: string;
  createdAt: number;
}

export interface BlackoutDate {
  id: string;
  member_name: string;
  unavailable_date: string; // YYYY-MM-DD
  createdAt: number;
}

// Joined representation for UI
export interface SetlistSong extends Setlist {
  song: Song;
}
