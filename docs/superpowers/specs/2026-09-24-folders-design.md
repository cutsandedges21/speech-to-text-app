# Folders and saved recordings: design

Approved 2026-09-24.

## Goal

Add a side nav where the user can create folders and organize their transcribed recordings. The recorder stays the main screen.

## Decisions

| Question | Answer |
|---|---|
| What is a recording? | One mic session: tap mic → talk → tap stop. Tapping the mic again starts a new recording. |
| Audio? | Text only. Audio playback is a possible later upgrade. |
| Folder depth | One level. Folders hold recordings; no folders inside folders. |
| Layout | Side nav lists folders (expandable, showing their recordings) and Unfiled. Main screen shows the open recording plus the mic dock. iPhone: drawer from the left via a ≡ button. Screens ≥ 900 px: nav always visible. |

## Behavior

1. Tapping the mic creates a new recording in the folder of the recording on screen and opens it. On the blank recorder screen (no recording open), it uses the folder chosen in that screen's picker (Unfiled by default). Text is saved as each sentence locks in. A session that ends with no text is deleted.
2. Title: the first ~6 words of the text until the user renames it (tap the title → native prompt). An empty title reverts to the automatic one.
3. A folder picker under the title (native `<select>`) moves the open recording. On the blank recorder screen, the same picker sets where the next recording goes.
4. Side nav, top to bottom: "New recording" (opens the blank recorder) and "+ Folder"; folders sorted by name, each with a count, tap to expand/collapse, "⋯" → New recording here / Rename / Delete; an Unfiled section. Recordings within a group are sorted newest first, shown as title + date. The open recording is highlighted.
5. Deleting a folder moves its recordings to Unfiled. Confirmed with a native dialog.
6. Dock: Delete (two-tap, removes the open recording) · Mic · Copy.
7. On first launch after the update, the old single transcript (`speech-to-text:transcript`) becomes one recording in Unfiled, then the old key is removed.
8. While the mic is live, the draft text shows only in the recording being recorded.

## Data

```ts
interface Folder { id: string; name: string; createdAt: number }
interface Recording {
  id: string
  folderId: string | null // null = Unfiled
  title: string | null     // null = automatic title from the text
  text: string
  createdAt: number
  updatedAt: number
}
interface Library { version: 1; folders: Folder[]; recordings: Recording[] }
```

Stored as JSON in localStorage key `speech-to-text:library` (≈5 MB ≈ 100 hours of text). A failed save shows a notice. All reads and writes go through `src/library/store.ts`, so moving to IndexedDB later (needed for audio) touches one file.

## Architecture

- `src/library/library.ts`: pure functions (create/rename/delete folder, add/update/rename/move/delete recording, grouping and sorting, automatic title). Unit tested.
- `src/library/store.ts`: load/save + migration from the old transcript key. Unit tested with a fake storage.
- `src/library/useLibrary.ts`: React state + persistence.
- `useLiveTranscriber` changes: one `LiveTranscriber` per mic session, bound to that session's recording id, so late results land in the right recording. The shared Whisper engine serializes the work.
- UI: `SideNav` (drawer/sidebar), `RecordingHeader` (title + folder picker), existing transcript and dock.

## Out of scope

Audio storage, nested folders, search, drag and drop, sync across devices.

## Verification

- Unit tests for every library function and the migration.
- Playwright (390×844 and 1200×800): create a folder, record with the fake mic, confirm the recording appears with an automatic title, move it into the folder, rename it, reload and confirm everything persisted, delete the folder and confirm the recording is in Unfiled, then delete the recording.
