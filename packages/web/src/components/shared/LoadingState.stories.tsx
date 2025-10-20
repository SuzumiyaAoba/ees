import type { Meta, StoryObj } from '@storybook/react'
import { LoadingState } from './LoadingState'

const meta: Meta<typeof LoadingState> = {
  title: 'Shared/LoadingState',
  component: LoadingState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithMessage: Story = {
  args: {
    message: 'Loading embeddings...',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    message: 'Loading...',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    message: 'Processing large dataset...',
  },
}

export const WithoutMessage: Story = {
  args: {
    message: '',
  },
}

export const CustomMessage: Story = {
  args: {
    message: 'Please wait while we process your request...',
  },
}
