# Carto Bureau

Office floor plan manager — place seats on a map, import a people list, and assign everyone by drag & drop.

## Features

- **Multiple floor plans** — manage several floors or buildings, switch between them from a dropdown
- **Seat placement** — click anywhere on a floor plan image to place a seat marker; click an empty seat to remove it
- **People import** — import a CSV or Excel file (`.csv`, `.xlsx`, `.xls`); flexible column name detection (French and English)
- **Drag & drop assignment** — drag a person from the sidebar onto a seat; drag between seats to move or swap; drop back on the sidebar to unassign
- **Work modes** — people can be marked `onsite`, `hybrid`, or `remote`; remote workers appear in a dedicated section and cannot be assigned to a seat
- **Rich text notes** — place draggable text notes anywhere on the plan (bold, italic, font size)
- **Persistent storage** — all data (plans, seats, assignments, people, images) stored in the browser via IndexedDB; survives page reloads

## CSV / Excel format

Column names are matched case-insensitively, with or without accents. Supported names:

| Field | Accepted column names |
|---|---|
| First name | `firstName`, `first name`, `prénom`, `prenom` |
| Last name | `lastName`, `last name`, `nom` |
| Team | `team`, `équipe`, `equipe`, `service`, `department` |
| Role | `role`, `rôle`, `poste`, `fonction`, `title` |
| Work mode | `workMode`, `work mode`, `télétravail`, `mode` → values: `remote`/`télétravail`, `hybrid`/`hybride`, anything else = `onsite` |

## Interaction modes

| Mode | Action |
|---|---|
| **View** | Read-only; notes can still be moved and edited |
| **Place seats** | Click on the plan to add a seat marker; click an existing empty seat to remove it |
| **Assign** | Drag a person from the sidebar onto a seat; drag a seat badge to another seat (move or swap); drop on the sidebar to unassign |

## Getting started

### Prerequisites

- Node.js ≥ 18
- npm

### Development

```bash
npm install
npm run dev
# → http://localhost:5173
```

### Production build

```bash
npm run build
# output in dist/
```

### Preview the production build locally

```bash
npm run preview
```

## Docker

Build and run with a single Nginx container:

```bash
docker build -t carto-bureau .
docker run -p 8080:80 carto-bureau
# → http://localhost:8080
```

The Dockerfile uses a multi-stage build (Node to compile, Nginx to serve). Assets are cached for one year; all routes fall back to `index.html` for SPA routing.

## Tech stack

| Layer | Library |
|---|---|
| Framework | Vue 3 + TypeScript + Vite |
| State | Pinia |
| Storage | Dexie.js (IndexedDB) |
| Styling | Tailwind CSS v4 |
| Rich text | Tiptap v3 |
| File import | xlsx + PapaParse |

## Project structure

```
src/
├── types/          # TypeScript interfaces (Plan, Seat, Note, Person)
├── db/             # Dexie database class
├── stores/         # Pinia stores (plans, people)
├── composables/    # useFloorPlan, useImageStorage
├── components/
│   ├── layout/     # AppHeader, AppSidebar
│   ├── plan/       # FloorPlanCanvas, SeatMarker, NoteOverlay
│   ├── people/     # PersonCard, PeopleImporter, PeopleFilter
│   ├── notes/      # TiptapEditor
│   └── modals/     # AddPlanModal
└── views/          # PlanView
```

## Roadmap

- [ ] Backend / shared server to centralise the plan across multiple users
- [ ] Export plan as PDF or image
- [ ] Seat labels
- [ ] Undo / redo
