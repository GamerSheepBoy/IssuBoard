/**
 * IssuBoard Configuration
 * 表示するリポジトリの設定
 */
const CONFIG = {
  // 表示するリポジトリ（公開リポジトリのみ対応）
  owner: 'GamerSheepBoy',
  repo: 'IssuBoard',

  // Doing と判定するラベル名
  doingLabel: 'DOING',

  // カラム定義
  columns: {
    incoming: {
      title: '📥 Incoming',
    },
    doing: {
      title: '🔨 Doing',
    },
    done: {
      title: '✅ Done',
    },
  },

  // 1ページあたりの取得件数（最大100）
  perPage: 100,
};