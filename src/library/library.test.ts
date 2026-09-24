import { describe, expect, test } from 'vitest'
import {
  addFolder,
  addRecording,
  deleteFolder,
  deleteIfEmpty,
  deleteRecording,
  emptyLibrary,
  groupLibrary,
  moveRecording,
  recordingTitle,
  renameFolder,
  renameRecording,
  setRecordingText,
  type Library,
  type Recording,
} from './library'

/** A library with folder "f1" (Errands) holding recording "r1", plus unfiled "r2". */
function sample(): Library {
  let lib = addFolder(emptyLibrary(), 'Errands', 'f1', 100)
  lib = addRecording(lib, 'r1', 'f1', 200)
  lib = addRecording(lib, 'r2', null, 300)
  return lib
}

const find = (lib: Library, id: string) => lib.recordings.find((r) => r.id === id)

function rec(overrides: Partial<Recording>): Recording {
  return { id: 'x', folderId: null, title: null, text: '', createdAt: 0, updatedAt: 0, ...overrides }
}

describe('folders', () => {
  test('addFolder trims the name', () => {
    const lib = addFolder(emptyLibrary(), '  Work  ', 'f1', 5)
    expect(lib.folders).toEqual([{ id: 'f1', name: 'Work', createdAt: 5 }])
  })

  test('addFolder ignores a blank name', () => {
    const lib = emptyLibrary()
    expect(addFolder(lib, '   ', 'f1', 5)).toBe(lib)
  })

  test('renameFolder changes the name', () => {
    expect(renameFolder(sample(), 'f1', ' Shopping ').folders[0].name).toBe('Shopping')
  })

  test('renameFolder ignores a blank name', () => {
    const lib = sample()
    expect(renameFolder(lib, 'f1', '')).toBe(lib)
  })

  test('deleteFolder moves its recordings to Unfiled', () => {
    const lib = deleteFolder(sample(), 'f1')
    expect(lib.folders).toEqual([])
    expect(find(lib, 'r1')?.folderId).toBeNull()
    expect(lib.recordings).toHaveLength(2)
  })
})

describe('recordings', () => {
  test('addRecording starts empty in the given folder', () => {
    expect(find(sample(), 'r1')).toEqual({
      id: 'r1',
      folderId: 'f1',
      title: null,
      text: '',
      createdAt: 200,
      updatedAt: 200,
    })
  })

  test('setRecordingText saves the text and the time', () => {
    const r = find(setRecordingText(sample(), 'r1', 'Buy milk.', 999), 'r1')
    expect(r?.text).toBe('Buy milk.')
    expect(r?.updatedAt).toBe(999)
  })

  test('setRecordingText ignores an unknown recording', () => {
    const lib = sample()
    expect(setRecordingText(lib, 'nope', 'x', 1)).toBe(lib)
  })

  test('renameRecording trims the title', () => {
    expect(find(renameRecording(sample(), 'r1', ' Groceries '), 'r1')?.title).toBe('Groceries')
  })

  test('renameRecording with a blank title goes back to the automatic title', () => {
    let lib = renameRecording(sample(), 'r1', 'Groceries')
    lib = renameRecording(lib, 'r1', '  ')
    expect(find(lib, 'r1')?.title).toBeNull()
  })

  test('moveRecording moves into a folder and back to Unfiled', () => {
    let lib = moveRecording(sample(), 'r2', 'f1')
    expect(find(lib, 'r2')?.folderId).toBe('f1')
    lib = moveRecording(lib, 'r2', null)
    expect(find(lib, 'r2')?.folderId).toBeNull()
  })

  test('moveRecording ignores a folder that does not exist', () => {
    const lib = sample()
    expect(moveRecording(lib, 'r2', 'ghost')).toBe(lib)
  })

  test('deleteRecording removes it', () => {
    expect(find(deleteRecording(sample(), 'r1'), 'r1')).toBeUndefined()
  })

  test('deleteIfEmpty removes a recording with no words', () => {
    expect(find(deleteIfEmpty(sample(), 'r1'), 'r1')).toBeUndefined()
  })

  test('deleteIfEmpty keeps a recording that has text', () => {
    const lib = setRecordingText(sample(), 'r1', 'Hello.', 1)
    expect(deleteIfEmpty(lib, 'r1')).toBe(lib)
  })

  test('functions never change the library they are given', () => {
    const lib = sample()
    const before = JSON.stringify(lib)
    setRecordingText(lib, 'r1', 'x', 1)
    moveRecording(lib, 'r2', 'f1')
    deleteFolder(lib, 'f1')
    renameRecording(lib, 'r1', 'y')
    expect(JSON.stringify(lib)).toBe(before)
  })
})

describe('recordingTitle', () => {
  test('uses the custom title when there is one', () => {
    expect(recordingTitle(rec({ title: 'Groceries', text: 'Milk and eggs.' }))).toBe('Groceries')
  })

  test('uses the first six words of the text', () => {
    const r = rec({ text: 'Milk, eggs, and the bread from the corner store.' })
    expect(recordingTitle(r)).toBe('Milk, eggs, and the bread from…')
  })

  test('shows a short text whole, without its final full stop', () => {
    expect(recordingTitle(rec({ text: 'Call the dentist.' }))).toBe('Call the dentist')
  })

  test('falls back to "New recording" when there is no text yet', () => {
    expect(recordingTitle(rec({}))).toBe('New recording')
  })
})

describe('groupLibrary', () => {
  test('sorts folders by name, ignoring case, and keeps empty folders', () => {
    let lib = addFolder(emptyLibrary(), 'work', 'a', 1)
    lib = addFolder(lib, 'Errands', 'b', 2)
    lib = addFolder(lib, 'Ideas', 'c', 3)
    expect(groupLibrary(lib).folders.map((g) => g.folder.name)).toEqual(['Errands', 'Ideas', 'work'])
  })

  test('a recording whose folder is missing shows up in Unfiled instead of vanishing', () => {
    const lib: Library = { ...emptyLibrary(), recordings: [rec({ id: 'lost', folderId: 'ghost' })] }
    expect(groupLibrary(lib).unfiled.map((r) => r.id)).toEqual(['lost'])
  })

  test('lists recordings newest first inside each group', () => {
    let lib = addFolder(emptyLibrary(), 'Errands', 'f1', 1)
    lib = addRecording(lib, 'old', 'f1', 10)
    lib = addRecording(lib, 'new', 'f1', 20)
    lib = addRecording(lib, 'u1', null, 5)
    lib = addRecording(lib, 'u2', null, 50)
    const groups = groupLibrary(lib)
    expect(groups.folders[0].recordings.map((r) => r.id)).toEqual(['new', 'old'])
    expect(groups.unfiled.map((r) => r.id)).toEqual(['u2', 'u1'])
  })
})
