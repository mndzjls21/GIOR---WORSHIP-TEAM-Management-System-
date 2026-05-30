import { db } from './src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function listSongs() {
  const q = await getDocs(collection(db, 'songs'));
  q.forEach(d => console.log(d.id, d.data().title, d.data().media_url));
}
listSongs();
