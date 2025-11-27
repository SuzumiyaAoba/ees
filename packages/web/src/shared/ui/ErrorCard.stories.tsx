import type { Meta, StoryObj } from '@storybook/react'
import { ErrorCard } from './ErrorCard'

const meta: Meta<typeof ErrorCard> = {
  title: 'Shared/ErrorCard',
  component: ErrorCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    error: 'Something went wrong',
  },
}

export const WithStringError: Story = {
  args: {
    error: 'Failed to load embeddings',
    title: 'Load Error',
  },
}

export const WithErrorObject: Story = {
  args: {
    error: new Error('Network connection failed'),
    title: 'Connection Error',
  },
}

export const WithCustomTitle: Story = {
  args: {
    error: 'Invalid file format',
    title: 'Upload Error',
  },
}

export const WithLongMessage: Story = {
  args: {
    error: 'This is a very long error message that demonstrates how the ErrorCard component handles longer text content and wraps it appropriately within the alert container.',
    title: 'Detailed Error',
  },
}

export const NetworkError: Story = {
  args: {
    error: new Error('Failed to fetch: 500 Internal Server Error'),
    title: 'Server Error',
  },
}

export const ValidationError: Story = {
  args: {
    error: 'Invalid input: Please provide a valid email address',
    title: 'Validation Error',
  },
}
