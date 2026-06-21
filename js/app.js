/**
 * IssuBoard - Main application entry point
 */
async function main() {
  const repoDisplay = document.getElementById('repo-display');
  if (repoDisplay) {
    repoDisplay.textContent = `${CONFIG.owner}/${CONFIG.repo}`;
  }

  // ローディング表示
  KanbanBoard.showLoading();

  try {
    // GitHub API からIssuesを取得
    const issues = await GitHubAPI.fetchIssues(CONFIG.owner, CONFIG.repo, CONFIG.perPage);

    // カラムに振り分け
    const classified = KanbanBoard.classifyIssues(issues, CONFIG.columns);

    // レンダリング
    KanbanBoard.render(classified);

    // ドラッグ&ドロップのセットアップ（表示のみ移動、実際の更新は行わない）
    KanbanBoard.setupDropZones((issueNumber, targetColumnId) => {
      console.log(`[IssuBoard] Drag detected: Issue #${issueNumber} → ${targetColumnId}`);
      console.log('  (Read-only mode: issue labels are not updated on GitHub)');
    });

  } catch (error) {
    console.error('[IssuBoard] Error:', error);
    KanbanBoard.showError(error.message);
  }
}

// Vitest環境とブラウザ両対応のためexport
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { main };
}

// ブラウザでのみ自動実行（Vitestでは実行しない）
if (typeof globalThis.__VITEST__ === 'undefined') {
  main().catch(console.error);
}
