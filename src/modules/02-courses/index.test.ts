import { expect, test } from 'bun:test'
import mod from './index'

const get = (path: string) => mod.router.handle(new Request(`http://localhost${path}`))

test('Module 2 dashboard loads', async () => {
  const response = await get('/')
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('Course Management')
})

test('Course catalog loads', async () => {
  const response = await get('/catalog')
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('Course Catalog')
})

test('JSON API works', async () => {
  const response = await get('/api/courses')
  expect(response.status).toBe(200)
  const data = (await response.json()) as { courses: Array<any> }
  expect(Array.isArray(data.courses)).toBe(true)
})
