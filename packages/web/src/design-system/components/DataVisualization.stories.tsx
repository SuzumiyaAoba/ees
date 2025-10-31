import type { Meta, StoryObj } from '@storybook/react'
import {
  StatCard,
  MetricDisplay,
  ChartCard,
  ProgressBar,
} from './DataVisualization'
import { Grid } from './Layout'
import { Database, Users, Activity, FileText, Zap } from 'lucide-react'

// StatCard Stories
const statCardMeta = {
  title: 'Design System/Data Visualization/StatCard',
  component: StatCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof StatCard>

export default statCardMeta

type StatCardStory = StoryObj<typeof statCardMeta>

export const DefaultStatCard: StatCardStory = {
  args: {
    title: 'Total Embeddings',
    value: '12,345',
    description: 'Active embeddings in database',
    icon: Database,
  },
}

export const WithTrend: StatCardStory = {
  args: {
    title: 'API Requests',
    value: '8,432',
    description: 'Last 24 hours',
    icon: Activity,
    trend: {
      value: 12.5,
      isPositive: true,
      label: 'vs. previous day',
    },
  },
}

export const NegativeTrend: StatCardStory = {
  args: {
    title: 'Error Rate',
    value: '2.4%',
    description: 'Last hour',
    icon: Activity,
    variant: 'error',
    trend: {
      value: -15,
      isPositive: true,
      label: 'improvement',
    },
  },
}

export const AllVariants: StatCardStory = {
  args: {} as never,
  render: () => (
    <Grid cols={2} gap="lg">
      <StatCard
        title="Default"
        value="1,234"
        icon={Database}
        variant="default"
        description="Primary variant"
      />
      <StatCard
        title="Success"
        value="98.5%"
        icon={Activity}
        variant="success"
        description="Uptime"
        trend={{ value: 0.5, isPositive: true }}
      />
      <StatCard
        title="Warning"
        value="45 mins"
        icon={Zap}
        variant="warning"
        description="Avg response time"
        trend={{ value: 8, isPositive: false }}
      />
      <StatCard
        title="Error"
        value="3"
        icon={FileText}
        variant="error"
        description="Failed requests"
      />
    </Grid>
  ),
}

export const GlowingCards: StatCardStory = {
  args: {} as never,
  render: () => (
    <Grid cols={3}>
      <StatCard
        title="Active Users"
        value="2,451"
        icon={Users}
        glowing
        trend={{ value: 23, isPositive: true }}
      />
      <StatCard
        title="Embeddings/sec"
        value="156"
        icon={Zap}
        glowing
        variant="success"
      />
      <StatCard
        title="Storage Used"
        value="2.4 GB"
        icon={Database}
        glowing
        variant="info"
        description="of 10 GB"
      />
    </Grid>
  ),
}

// MetricDisplay Stories
const metricMeta = {
  title: 'Design System/Data Visualization/MetricDisplay',
  component: MetricDisplay,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MetricDisplay>

export const DefaultMetric: StoryObj<typeof metricMeta> = {
  args: {
    label: 'Total Revenue',
    value: '$45,231',
    change: {
      value: 12.5,
      period: 'this month',
    },
  },
}

export const MetricSizes: StoryObj<typeof metricMeta> = {
  args: {} as never,
  render: () => (
    <div className="space-y-8">
      <MetricDisplay
        label="Small Metric"
        value="123"
        size="sm"
        change={{ value: 5 }}
      />
      <MetricDisplay
        label="Medium Metric (Default)"
        value="1,234"
        size="md"
        change={{ value: -3.2, period: 'today' }}
      />
      <MetricDisplay
        label="Large Metric"
        value="12,345"
        size="lg"
        change={{ value: 15.8, period: 'this week' }}
      />
    </div>
  ),
}

export const InlineMetrics: StoryObj<typeof metricMeta> = {
  args: {} as never,
  render: () => (
    <div className="space-y-4">
      <MetricDisplay
        label="Embeddings"
        value="8,432"
        inline
        change={{ value: 12 }}
      />
      <MetricDisplay
        label="Queries/sec"
        value="156"
        inline
        change={{ value: -5, period: 'vs last hour' }}
      />
      <MetricDisplay label="Avg Latency" value="45ms" inline />
    </div>
  ),
}

// ChartCard Stories
const chartCardMeta = {
  title: 'Design System/Data Visualization/ChartCard',
  component: ChartCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ChartCard>

export const DefaultChartCard: StoryObj<typeof chartCardMeta> = {
  args: {
    title: 'Embedding Performance',
    description: 'Last 7 days',
    children: (
      <div className="h-64 flex items-center justify-center bg-muted/30 rounded">
        <p className="text-muted-foreground">Chart content goes here</p>
      </div>
    ),
  },
}

export const WithAction: StoryObj<typeof chartCardMeta> = {
  args: {
    title: 'API Usage',
    description: 'Real-time metrics',
    action: (
      <button className="text-sm text-primary hover:underline">View Details</button>
    ),
    children: (
      <div className="h-48 flex items-center justify-center bg-muted/30 rounded">
        <p className="text-muted-foreground">Chart placeholder</p>
      </div>
    ),
  },
}

// ProgressBar Stories
const progressMeta = {
  title: 'Design System/Data Visualization/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ProgressBar>

export const DefaultProgress: StoryObj<typeof progressMeta> = {
  args: {
    label: 'Storage Usage',
    value: 65,
    max: 100,
  },
}

export const AllProgressVariants: StoryObj<typeof progressMeta> = {
  args: {} as never,
  render: () => (
    <div className="space-y-6">
      <ProgressBar
        label="Default"
        value={45}
        variant="default"
      />
      <ProgressBar
        label="Success"
        value={85}
        variant="success"
      />
      <ProgressBar
        label="Warning"
        value={70}
        variant="warning"
      />
      <ProgressBar
        label="Error"
        value={95}
        variant="error"
      />
    </div>
  ),
}

export const ProgressSizes: StoryObj<typeof progressMeta> = {
  args: {} as never,
  render: () => (
    <div className="space-y-6">
      <ProgressBar label="Small" value={60} size="sm" />
      <ProgressBar label="Medium (Default)" value={60} size="md" />
      <ProgressBar label="Large" value={60} size="lg" />
    </div>
  ),
}

export const WithoutLabel: StoryObj<typeof progressMeta> = {
  args: {} as never,
  render: () => (
    <div className="space-y-4">
      <ProgressBar value={30} showValue={false} />
      <ProgressBar value={60} showValue={false} variant="success" />
      <ProgressBar value={90} showValue={false} variant="error" />
    </div>
  ),
}

// Dashboard Example
export const DashboardExample: StatCardStory = {
  args: {} as never,
  render: () => (
    <div className="space-y-6">
      <Grid cols={4} gap="lg">
        <StatCard
          title="Total Embeddings"
          value="12,345"
          icon={Database}
          glowing
          trend={{ value: 12.5, isPositive: true, label: 'this month' }}
        />
        <StatCard
          title="Active Users"
          value="2,451"
          icon={Users}
          variant="success"
          glowing
          trend={{ value: 8.2, isPositive: true, label: 'this week' }}
        />
        <StatCard
          title="Avg Latency"
          value="45ms"
          icon={Zap}
          variant="info"
          description="Response time"
        />
        <StatCard
          title="Success Rate"
          value="99.8%"
          icon={Activity}
          variant="success"
          description="Last 24h"
        />
      </Grid>

      <Grid cols={2} gap="lg">
        <ChartCard
          title="Embedding Creation"
          description="Daily volume over time"
          action={
            <button className="text-sm text-primary hover:underline">
              Export
            </button>
          }
        >
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 rounded">
            <p className="text-muted-foreground">Chart visualization</p>
          </div>
        </ChartCard>

        <ChartCard title="Resource Usage" description="Current allocation">
          <div className="space-y-4">
            <ProgressBar
              label="CPU"
              value={45}
              max={100}
              variant="success"
              size="lg"
            />
            <ProgressBar
              label="Memory"
              value={72}
              max={100}
              variant="warning"
              size="lg"
            />
            <ProgressBar
              label="Storage"
              value={28}
              max={100}
              variant="default"
              size="lg"
            />
          </div>
        </ChartCard>
      </Grid>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
}
