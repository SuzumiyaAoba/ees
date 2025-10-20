# Storybook Documentation

このディレクトリには、EES Web DashboardのStorybook設定が含まれています。

## 使用方法

### Storybookの起動

```bash
npm run storybook
```

Storybookは `http://localhost:6006` で起動します。

### Storybookのビルド

```bash
npm run build-storybook
```

## 設定ファイル

- `main.ts` - Storybookのメイン設定ファイル
- `preview.ts` - グローバル設定とデコレーター

## コンポーネントストーリー

以下のコンポーネントのStoryが作成されています：

### UIコンポーネント
- **Button** - ボタンコンポーネントのバリエーション
- **Card** - カードコンポーネントのレイアウト
- **Input** - 入力フィールドのバリエーション
- **Badge** - バッジコンポーネントのバリエーション

### ビジネスロジックコンポーネント
- **EmbeddingList** - 埋め込みリストの表示
- **FileUpload** - ファイルアップロード機能
- **SearchInterface** - 検索インターフェース
- **ProviderManagement** - プロバイダー管理

### 共有コンポーネント
- **LoadingState** - ローディング状態の表示
- **ErrorCard** - エラー表示

## 新しいStoryの追加

新しいコンポーネントのStoryを作成する場合：

1. コンポーネントファイルと同じディレクトリに `ComponentName.stories.tsx` を作成
2. 以下のテンプレートを使用：

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { ComponentName } from './ComponentName'

const meta: Meta<typeof ComponentName> = {
  title: 'Category/ComponentName',
  component: ComponentName,
  parameters: {
    layout: 'centered', // または 'padded'
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}
```

## パスエイリアス

`@/` エイリアスが設定されており、`src/` ディレクトリを指します。
