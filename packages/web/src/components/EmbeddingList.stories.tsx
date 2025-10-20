import type { Meta, StoryObj } from '@storybook/react'
import { EmbeddingList } from './EmbeddingList'
import type { Embedding } from '@/types/api'

const meta: Meta<typeof EmbeddingList> = {
  title: 'Components/EmbeddingList',
  component: EmbeddingList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onEmbeddingSelect: { action: 'embedding-selected' },
    onEmbeddingEdit: { action: 'embedding-edit' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithSelection: Story = {
  args: {
    onEmbeddingSelect: (embedding: Embedding) => {
      console.log('Selected embedding:', embedding)
    },
  },
}

export const WithEdit: Story = {
  args: {
    onEmbeddingEdit: (embedding: Embedding) => {
      console.log('Edit embedding:', embedding)
    },
  },
}

export const WithBothCallbacks: Story = {
  args: {
    onEmbeddingSelect: (embedding: Embedding) => {
      console.log('Selected embedding:', embedding)
    },
    onEmbeddingEdit: (embedding: Embedding) => {
      console.log('Edit embedding:', embedding)
    },
  },
}
