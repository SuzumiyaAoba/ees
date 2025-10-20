import type { Meta, StoryObj } from '@storybook/react'
import { FileUpload } from './FileUpload'

const meta: Meta<typeof FileUpload> = {
  title: 'Components/FileUpload',
  component: FileUpload,
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

export const WithInitialFiles: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'FileUpload component with initial files ready for upload.',
      },
    },
  },
}

export const InDirectoryMode: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'FileUpload component in directory upload mode.',
      },
    },
  },
}
