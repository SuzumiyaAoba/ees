import type { Meta, StoryObj } from '@storybook/react'
import { SearchInterface } from './SearchInterface'

const meta: Meta<typeof SearchInterface> = {
  title: 'Components/SearchInterface',
  component: SearchInterface,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onResultSelect: { action: 'result-selected' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithResultSelection: Story = {
  args: {
    onResultSelect: (result: any) => {
      console.log('Selected result:', result)
    },
  },
}

export const WithInitialQuery: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'SearchInterface with a pre-filled search query.',
      },
    },
  },
}
