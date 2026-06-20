/**
 * IssuBoard Configuration
 * 表示するリポジトリの設定
 */
const CONFIG = {
  // 表示するリポジトリ（公開リポジトリのみ対応）
  owner: 'GamerSheepBoy',
  repo: 'IssuBoard',

  // カラム定義（ラベル名 → カラムのマッピング）
  columns: {
    backlog: {
      title: '📋 Backlog',
      labels: ['backlog'],        // このラベルが付いたIssue
      includeNoLabel: true,       // ラベルなしのIssueも含める
    },
    'in-progress': {
      title: '🔨 In Progress',
      labels: ['in-progress'],
      includeNoLabel: false,
    },
    done: {
      title: '✅ Done',
      labels: ['done'],
      includeNoLabel: false,
      includeClosed: true,        // Closed状態のIssueも含める
    },
  },

  // 1ページあたりの取得件数（最大100）
  perPage: 100,
};