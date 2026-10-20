// MODULE 2: Course Management
//
// Scope from the project brief:
//   - Create courses
//   - Edit course information
//   - Course settings
//   - Course catalog
//   - Student enrollment
//   - Instructor assignment to courses
//   - Archive active/inactive courses
//
// HOW TO ADD A PAGE TO THE ROUTER (basic demo):
//   1. Find the router at the bottom of this file.
//   2. Copy the  .get('/hello', ...)  line.
//   3. Change the address ('/hello') and the HTML it returns.
//   4. Save. Your new page is at  http://localhost:3000/02-courses/<your-address>

import { Elysia } from 'elysia'
import { defineModule, moduleBase } from '../../core/defineModule'

const base = moduleBase(import.meta.dir)

// Simple list of courses (stored in memory)
const courses = [
  {
    id: '1',
    code: 'PROG2020',
    title: 'Advanced Software Development Tools',
    description: 'Learning Git, Bun, and web development.',
    capacity: 30,
  },
  {
    id: '2',
    code: 'CSCN72030',
    title: 'System Architecture',
    description: 'Designing backend systems and APIs.',
    capacity: 35,
  },
]

export default defineModule({
  name: 'Module 2: Course Management',
  description: 'Courses, catalog, enrollment',

  router: new Elysia()
    // 1. Home page of Module 2
    .get('/', () => {
      let html = '<h1>Module 2: Course Management</h1>'
      html +=
        '<p><a href="' +
        base +
        '/create">Create New Course</a> | <a href="' +
        base +
        '/catalog">View Catalog</a></p>'
      html += '<h2>All Courses</h2>'

      for (let i = 0; i < courses.length; i++) {
        const c = courses[i]
        html += '<div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px;">'
        html += '<h3>' + c.code + ': ' + c.title + '</h3>'
        html += '<p>' + c.description + '</p>'
        html += '<p>Capacity: ' + c.capacity + '</p>'
        html += '<a href="' + base + '/' + c.id + '/edit">Edit Course</a>'
        html += '</div>'
      }

      return `<!doctype html><html><head><title>Course Management</title></head><body style="font-family: Arial; margin: 40px;">
        <p><a href="/">Back to Home</a></p>
        ${html}
      </body></html>`
    })

    // 2. Catalog Page
    .get('/catalog', () => {
      let html = '<h1>Course Catalog</h1>'

      for (let i = 0; i < courses.length; i++) {
        const c = courses[i]
        html += '<ul><li><strong>' + c.code + '</strong> - ' + c.title + '</li></ul>'
      }

      html += '<p><a href="' + base + '">Back to Dashboard</a></p>'
      return `<!doctype html><html><head><title>Catalog</title></head><body style="font-family: Arial; margin: 40px;">${html}</body></html>`
    })

    // 3. Create Course Form Page
    .get('/create', () => {
      return `<!doctype html><html><head><title>Create Course</title></head><body style="font-family: Arial; margin: 40px;">
        <h1>Create a Course</h1>
        <form method="POST" action="${base}/create">
          <label>Course Code:</label><br>
          <input type="text" name="code" required><br><br>
          
          <label>Course Title:</label><br>
          <input type="text" name="title" required><br><br>
          
          <label>Description:</label><br>
          <textarea name="description" required></textarea><br><br>
          
          <label>Capacity:</label><br>
          <input type="number" name="capacity" value="30" required><br><br>
          
          <button type="submit">Save Course</button>
        </form>
        <p><a href="${base}">Back</a></p>
      </body></html>`
    })

    // 4. Handle Create Form Submit
    .post('/create', async ({ request }) => {
      const formData = await request.formData()
      const newCode = formData.get('code')
      const newTitle = formData.get('title')
      const newDesc = formData.get('description')
      const newCap = formData.get('capacity')

      // Add to our array
      const newCourse = {
        id: String(courses.length + 1),
        code: String(newCode),
        title: String(newTitle),
        description: String(newDesc),
        capacity: Number(newCap),
      }

      courses.push(newCourse)

      return `<!doctype html><html><head><title>Success</title></head><body style="font-family: Arial; margin: 40px;">
        <h1>Course Created Successfully!</h1>
        <p><a href="${base}">Back to Dashboard</a></p>
      </body></html>`
    })

    // 5. Edit Course Form Page
    .get('/:id/edit', ({ params }) => {
      let foundCourse = null
      for (let i = 0; i < courses.length; i++) {
        if (courses[i].id === params.id) {
          foundCourse = courses[i]
          break
        }
      }

      if (!foundCourse) {
        return 'Course not found'
      }

      return `<!doctype html><html><head><title>Edit Course</title></head><body style="font-family: Arial; margin: 40px;">
        <h1>Edit Course: ${foundCourse.code}</h1>
        <form method="POST" action="${base}/${foundCourse.id}/edit">
          <label>Course Code:</label><br>
          <input type="text" name="code" value="${foundCourse.code}" required><br><br>
          
          <label>Course Title:</label><br>
          <input type="text" name="title" value="${foundCourse.title}" required><br><br>
          
          <label>Description:</label><br>
          <textarea name="description" required>${foundCourse.description}</textarea><br><br>
          
          <label>Capacity:</label><br>
          <input type="number" name="capacity" value="${foundCourse.capacity}" required><br><br>
          
          <button type="submit">Update Course</button>
        </form>
        <p><a href="${base}">Cancel</a></p>
      </body></html>`
    })

    // 6. Handle Edit Form Submit
    .post('/:id/edit', async ({ params, request }) => {
      const formData = await request.formData()

      for (let i = 0; i < courses.length; i++) {
        if (courses[i].id === params.id) {
          courses[i].code = String(formData.get('code'))
          courses[i].title = String(formData.get('title'))
          courses[i].description = String(formData.get('description'))
          courses[i].capacity = Number(formData.get('capacity'))
          break
        }
      }

      return `<!doctype html><html><head><title>Updated</title></head><body style="font-family: Arial; margin: 40px;">
        <h1>Course Updated Successfully!</h1>
        <p><a href="${base}">Back to Dashboard</a></p>
      </body></html>`
    })

    // 7. JSON API for other teams
    .get('/api/courses', () => {
      return { courses: courses }
    }),
})
