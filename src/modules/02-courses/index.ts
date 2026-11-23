// index.ts
// The "brain" of module 2. It holds the course data and defines every route.
// All the HTML is in views.ts, all the CSS is in styles.ts - this file just
// wires them together with the data.
// Sprint 3 update: we swapped the plain array for a SQLite database! 

import { Elysia } from 'elysia'
import { defineModule, moduleBase } from '../../core/defineModule'
import { db } from './db/database'
import {
  catalogPage,
  createPage,
  dashboardPage,
  editPage,
  notFoundPage,
  successPage,
  enrollPage,
  type Course,
  type CourseFormInput,
  type Instructor,
} from './views'
import { docsPage } from './docsPage'

const base = moduleBase(import.meta.dir)

// Instructors are still just a hardcoded array for now. 
// Module 1 is supposed to have the real user accounts, but we haven't hooked 
// their API up to ours yet. That's a problem for future Jas.
const instructors: Instructor[] = [
  { id: 'inst-1', name: 'Dr. Ada Lovelace' },
  { id: 'inst-2', name: 'Prof. Alan Turing' },
  { id: 'inst-3', name: 'Prof. Grace Hopper' },
]

// ---- Database Helper Stuff ----

// SQLite is a bit annoying. It stores booleans as 0/1 and it doesn't know what 
// an array is. So the data coming OUT of the DB doesn't exactly match our `Course` type.
// I made this type to represent the raw ugly row.
type CourseRow = {
  id: string
  code: string
  title: string
  description: string
  capacity: number
  startDate: string
  section: string
  instructorId: string | null
  archived: number
}

// Because enrollments are in a separate table, I need to ask the DB for them 
// separately when building a Course object.
const enrollmentsStmt = db.prepare('SELECT student_id FROM enrollments WHERE course_id = ?')

// This takes the ugly DB row, grabs its enrollments, and spits out a nice 
// clean Course object that views.ts actually understands.
function hydrate(row: CourseRow): Course {
  const enrolled = enrollmentsStmt.all(row.id) as { student_id: string }[]
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    capacity: row.capacity,
    startDate: row.startDate,
    section: row.section,
    instructorId: row.instructorId,
    archived: row.archived === 1, // turn 1 back into true
    enrollments: enrolled.map((e) => e.student_id), // turn [{student_id: 'ahmed'}] into ['ahmed']
  }
}

// Prepared statements! I learned these in class. They make queries faster 
// and they protect against SQL injection because the values are passed separately.
const listAllStmt = db.prepare('SELECT * FROM courses ORDER BY id')
const listByIdStmt = db.prepare('SELECT * FROM courses WHERE id = ?')

function listCourses(): Course[] {
  const rows = listAllStmt.all() as CourseRow[]
  return rows.map(hydrate)
}

function findCourse(id: string): Course | undefined {
  const row = listByIdStmt.get(id) as CourseRow | undefined
  // if the row exists, hydrate it. if not, return undefined.
  return row ? hydrate(row) : undefined
}

// ---- Write Operations ----

function createCourse(input: CourseFormInput): Course {
  const id = crypto.randomUUID() // still using UUIDs so we don't collide with '1' or '2'
  
  db.prepare(`
    INSERT INTO courses (id, code, title, description, capacity, startDate, section, instructorId, archived)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0)
  `).run(id, input.code, input.title, input.description, input.capacity, input.startDate, input.section)

  // Instead of the `!`, we just check if it exists. 
  const newCourse = findCourse(id)
  if (!newCourse) throw new Error('Failed to create course')
  return newCourse
}
function updateCourse(id: string, input: CourseFormInput): Course | undefined {
  if (!findCourse(id)) return undefined // if it doesn't exist, don't bother updating

  // Notice how I'm NOT updating enrollments/instructorId/archived here.
  // Those have their own routes. This is just the main form fields.
  db.prepare(`
    UPDATE courses
    SET code = ?, title = ?, description = ?, capacity = ?, startDate = ?, section = ?
    WHERE id = ?
  `).run(input.code, input.title, input.description, input.capacity, input.startDate, input.section, id)
  
  return findCourse(id)
}

// Grabs the form data. Form values are ALWAYS strings, so I have to cast capacity 
// back to a Number.
async function readCourseForm(request: Request): Promise<CourseFormInput> {
  const form = await request.formData()
  return {
    code: String(form.get('code') ?? '').trim(),
    title: String(form.get('title') ?? '').trim(),
    description: String(form.get('description') ?? '').trim(),
    capacity: Number(form.get('capacity') ?? 0),
    startDate: String(form.get('startDate') ?? '').trim(),
    section: String(form.get('section') ?? '').trim(),
  }
} // <--- I added this missing closing bracket here!

// ---- Routes ----
// Each route is just: call a view function with the data it needs.
// The functions themselves are in views.ts.

export default defineModule({
  name: 'Module 2: Course Management',
  description: 'Courses, catalog, enrollment',

  router: new Elysia()
    // dashboard
    .get('/', ({ query }) => {
      const showArchived = query.archived === '1'
      // Swapped `courses` for `listCourses()` so it actually fetches from the DB
      return dashboardPage(base, listCourses(), showArchived)
    })

    // read-only catalog
    .get('/catalog', () => catalogPage(base, listCourses()))

    // show the "create a course" form
    .get('/create', () => createPage(base))

    // handle the form submit. After saving we show a success page.
    .post('/create', async ({ request }) => {
      createCourse(await readCourseForm(request))
      return successPage(base, 'Course Created Successfully!')
    })

    // show the edit form for one course
    .get('/:id/edit', ({ params }) => {
      const course = findCourse(params.id)
      if (!course) return notFoundPage(base)
      return editPage(base, course, instructors)
    })

    // handle the edit form submit
    .post('/:id/edit', async ({ params, request }) => {
      const updated = updateCourse(params.id, await readCourseForm(request))
      if (!updated) return notFoundPage(base)
      return successPage(base, 'Course Updated Successfully!')
    })

    // Assign instructor
    .post('/:id/assign-instructor', async ({ params, request, set }) => {
      const form = await request.formData()
      const value = String(form.get('instructorId') ?? '').trim()
      
      const course = findCourse(params.id)
      if (!course) {
        set.status = 404
        return notFoundPage(base)
      }

      const target = value === '' ? null : value
      if (target !== null && !instructors.find((i) => i.id === target)) {
        set.status = 400
        return notFoundPage(base, 'Instructor not found')
      }

      // Save the instructorId (could be a string or null) to the DB
      db.prepare('UPDATE courses SET instructorId = ? WHERE id = ?').run(target, params.id)
      return successPage(base, 'Instructor Assigned Successfully!')
    })

    // enrollment page (list + per-course enroll forms)
    .get('/enroll', () => enrollPage(base, listCourses()))

    // handle the enroll form submit
    .post('/:id/enroll', async ({ params, request }) => {
      // 1. Look up the course using the new DB helper
      const course = findCourse(params.id)
      if (!course) return notFoundPage(base)

      const form = await request.formData()
      const studentId = String(form.get('studentId') ?? '').trim()

      // 2. Run the exact same checks as before, but now `course.enrollments` 
      // actually comes from the DB because of the `hydrate` function.
      if (!studentId) return notFoundPage(base, 'Student ID is required')
      if (course.enrollments.includes(studentId))
        return notFoundPage(base, 'Student is already enrolled')
      if (course.enrollments.length >= course.capacity)
        return notFoundPage(base, 'Course is full')

      // 3. Save it into the enrollments table instead of pushing to an array
      db.prepare('INSERT INTO enrollments (course_id, student_id) VALUES (?, ?)').run(
        params.id,
        studentId,
      )
      return successPage(base, 'Student Enrolled Successfully!')
    })

    // ---- Archive ----
    .post('/:id/archive', ({ params, set }) => {
      const course = findCourse(params.id)
      if (!course) {
        set.status = 404
        return notFoundPage(base)
      }
      // Update the boolean (0/1) in the DB
      db.prepare('UPDATE courses SET archived = 1 WHERE id = ?').run(params.id)
      return successPage(base, `${course.code} archived`)
    })

    .post('/:id/unarchive', ({ params, set }) => {
      const course = findCourse(params.id)
      if (!course) {
        set.status = 404   
        return notFoundPage(base)
      }
      // Fixed: now saving the unarchive state to the DB instead of memory
      db.prepare('UPDATE courses SET archived = 0 WHERE id = ?').run(params.id)
      return successPage(base, `${course.code} restored to active`)
    })

    // Serve the OpenAPI spec file so Swagger UI can fetch it.
    .get('/openapi.yaml', ({ set }) => {
      set.headers['content-type'] = 'application/yaml'
      return Bun.file(`${import.meta.dir}/openapi.yaml`)
    })

    // Swagger UI page that renders the above spec.
    .get('/docs', () => docsPage(base))

    // JSON endpoint for other modules.
   .get('/api/courses', () => ({ courses: listCourses() })),
})