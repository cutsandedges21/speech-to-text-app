# utter: motion and interactions pass

Date: 2026-09-27

## Decisions (from the user)

- Empty-screen note reads "utter runs on your phone. Nothing you say is uploaded." The meta and manifest descriptions drop "Whisper" too.
- Swipe left on a recording row reveals Rename + Delete, copied from LifeOS `SwipeableExerciseRow` (drag="x", constraints -140..0, elastic 0.1, actions fade in over the first 40 px). Added: the row snaps open or shut on release, and only one row is open at a time.
- Deleting (swipe, bottom Delete button, folder Delete) happens at once and shows an Undo toast for 6 s, copied from LifeOS `UndoToast`. The bottom button loses its "Tap again" step.
- Light/dark toggle sits in the top bar, left of the status. It is the student-notes-app toggle: spring-driven sun-to-moon icon, and the new theme revealed through a circle growing from the button (View Transitions API, colour cross-fade fallback). Choice is stored in `utter:theme`; a pre-paint script in index.html stops a flash on load.

## Other changes

- Ready dot is green.
- Folder "..." button: the three dots morph into an X while the menu is open (outer dots slide in and stretch into the two strokes, middle dot shrinks away) and back when closed. The menu opens and closes with a height animation.
- Folder picker under the title becomes a custom popover: pill trigger, animated panel, check on the current folder, and "New folder" at the bottom.
- All `window.prompt` / `window.confirm` calls become one in-app dialog: card rises in, input is focused, and on Save the button turns into a drawn check before the card lifts away and the change lands.
- Motion everywhere else: record button (icon morph, spring press, spring-smoothed voice ring, ripple on start), transcript (new sentences ink in from grey), status label cross-fade, list rows animate in and out, the open-row highlight slides between rows, group expand/collapse, copy/delete label swaps, notices and loader collapse smoothly.
- `prefers-reduced-motion` turns it all off (CSS rule plus `MotionConfig reducedMotion="user"`).

## Library

- `restoreRecording(lib, recording)` and `restoreFolder(lib, folder, recordingIds)` for Undo. Unit tested.

## Out of scope

Swipe on folders, audio, search, sync.
