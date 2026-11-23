// db/database.ts
// Okay so for Sprint 3 we're finally moving away from the in-memory array.
// Good news: Bun has SQLite built in, so I didn't have to run `bun add` or install anything.
// I tried to copy the general structure of how Module 8 did theirs so we stay consistent.

import { Database } from 'bun:sqlite'

// This creates the actual .sqlite file inside our module folder.
// Note to self: make sure the .gitignore file in this folder actually ignores *.sqlite
// so I don't accidentally commit the database file to GitHub.
export const db = new Database('./src/modules/02-courses/db/courses.sqlite')

// OK, so this creates the tables. 
// The `IF NOT EXISTS` part is super important. Because this file runs every time the 
// server restarts, we only want to create the tables on the very first run. 
// If the tables are already there, SQLite just ignores this command.
db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    startDate TEXT NOT NULL,
    section TEXT NOT NULL,
    instructorId TEXT,
    archived INTEGER NOT NULL DEFAULT 0
  );

  -- I put enrollments in their own table because a student list is basically 
  -- a "many" relationship. Trying to store a JSON array in a single SQL column 
  -- felt like a bad idea.
  CREATE TABLE IF NOT EXISTS enrollments (
    course_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    PRIMARY KEY (course_id, student_id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );
`)

// We still need those two sample courses from Sprint 1 to show up when we first run it.
// `INSERT OR IGNORE` is a life saver here. It means "try to insert this, but if a row 
// with this ID already exists, just skip it". That way we don't get duplicate seed 
// data every time we save a file and restart the server.
const seedStmt = db.prepare(`
  INSERT OR IGNORE INTO courses
    (id, code, title, description, capacity, startDate, section, instructorId, archived)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

seedStmt.run(
  '1',
  'PROG2020',
  'Advanced Software Development Tools',
  'Learning Git, Bun, and web development.',
  30,
  '2026-01-10',
  'Section A',
  null,
  0,  // I'm using 0 and 1 for booleans because I don't think SQLite has a real boolean type
)

seedStmt.run(
  '2',
  'CSCN72030',
  'System Architecture',
  'Designing backend systems and APIs.',
  35,
  '2026-01-10',
  'Section B',
  null,
  0,
)