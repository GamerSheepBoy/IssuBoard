# IssuBoard 📋

GitHub Issues をカンバン風に表示するWebページ。GitHub Pages でホスティングします。

## 機能

- 公開リポジトリの Issues を3カラム（Backlog / In Progress / Done）に分類して表示
- ラベルベースで自動振り分け
- ドラッグ&ドロップ（表示上の移動のみ。実際のIssueは更新しません）
- ダークテーマ（GitHub風）

## 使い方

### 1. リポジトリ設定

`config.js` を開き、表示したいリポジトリのオーナー名とリポジトリ名を設定します：

```js
const CONFIG = {
  owner: 'your-username',    // ← あなたのGitHubユーザー名
  repo: 'your-repo',         // ← リポジトリ名
  // ...
};
```

### 2. ラベルの設定

表示したいリポジトリに以下のラベルを作成してください：

| ラベル名 | 用途 |
|---------|------|
| `backlog` | 未着手のIssue |
| `in-progress` | 作業中のIssue |
| `done` | 完了したIssue |

ラベルなしのIssueは自動的に Backlog に配置されます。
Closed状態のIssueは Done に配置されます。

### 3. デプロイ

`main` または `release` ブランチに push すると、GitHub Actions が自動的に GitHub Pages にデプロイします。

リポジトリの Settings > Pages で、Source を "GitHub Actions" に設定してください。

## 技術スタック

- Vanilla JavaScript（フレームワークなし）
- GitHub REST API（公開リポジトリのみ対応、認証不要）
- GitHub Pages + GitHub Actions

## ライセンス

MIT