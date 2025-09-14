import { Hono } from 'hono'
import { CreateUserSchema } from './schemas/user'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.post('/users', async (c) => {
  try {
    const body = await c.req.json()
    const user = CreateUserSchema.parse(body)
    return c.json({ message: 'User created', user })
  } catch (error) {
    return c.json({ error: 'Invalid request data' }, 400)
  }
})

export default app
