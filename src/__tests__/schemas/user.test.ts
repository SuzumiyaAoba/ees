import { describe, it, expect } from 'vitest'
import { CreateUserSchema } from '../../schemas/user'

describe('CreateUserSchema', () => {
  it('should validate valid user data', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30
    }

    const result = CreateUserSchema.parse(validData)
    expect(result).toEqual(validData)
  })

  it('should validate user data without age', () => {
    const validData = {
      name: 'Jane Doe',
      email: 'jane@example.com'
    }

    const result = CreateUserSchema.parse(validData)
    expect(result).toEqual(validData)
  })

  it('should reject invalid email', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'invalid-email'
    }

    expect(() => CreateUserSchema.parse(invalidData)).toThrow()
  })

  it('should reject empty name', () => {
    const invalidData = {
      name: '',
      email: 'john@example.com'
    }

    expect(() => CreateUserSchema.parse(invalidData)).toThrow()
  })
})