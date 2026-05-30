# Worship Setlist Builder

A comprehensive worship setlist builder and planner designed to manage song libraries, structure weekly service schedules, and integrate rehearsal media seamlessly.

## Features

- **Dynamic Setlist Management:** Easily arrange and organize songs into structured setlists.
- **Song Library:** Track keys, tempos, artists, chords, and tags for your repertoire.
- **Service Schedules:** Structure specific dates and services with integrated performance blocks.
- **Rehearsal Integration:** Play embedded YouTube videos or direct media links for rehearsal purposes directly within the app, letting team members review the material easily.
- **Firebase Backend:** Powered by a real-time Firestore database for synchronous updates across the team.

## Developer

**Built by:** Julius Mendoza  
**Contact:** [juliusmendoza809@gmail.com](mailto:juliusmendoza809@gmail.com)

## Directory Structure

To help navigate the codebase in GitHub, you can refer to the labels and documentation files located in major folders:
- **[`/src/`](src/README.md):** Main directory containing all source code and entry points.
- **[`/src/components/`](src/components/README.md):** Reusable React components that make up the interfaces (Song Library, Schedule, Setlist Builder).
- **[`/src/lib/`](src/lib/README.md):** Global utilities and integrations (e.g., Firebase initialization).

## Technologies Used

- React 19
- Vite
- Tailwind CSS
- Firebase Firestore & Realtime DB
- `lucide-react` for iconography
- `react-player` for multimedia embedded playback
