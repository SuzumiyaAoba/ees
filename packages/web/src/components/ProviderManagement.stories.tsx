import type { Meta, StoryObj } from '@storybook/react'
import { ProviderManagement } from './ProviderManagement'

const meta: Meta<typeof ProviderManagement> = {
  title: 'Components/ProviderManagement',
  component: ProviderManagement,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithOllamaOnline: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'ProviderManagement component when Ollama is online and available.',
      },
    },
  },
}

export const WithOllamaOffline: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'ProviderManagement component when Ollama is offline or unavailable.',
      },
    },
  },
}
