/**
 * IssuBoard - app.js main() のテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// app.js が依存するグローバルオブジェクトを事前に読み込む
import '../js/api.js';
import '../js/kanban.js';

// 各テスト前にDOMをリセット
beforeEach(() => {
  document.body.innerHTML = `
    <header>
      <div id="repo-info">
        <span id="repo-display">Loading...</span>
      </div>
    </header>
    <main>
      <div id="kanban-board">
        <div class="kanban-column" data-status="incoming">
          <div class="column-header">
            <h2>📥 Incoming</h2>
            <span class="issue-count" id="count-incoming">0</span>
          </div>
          <div class="column-body" id="column-incoming"></div>
        </div>
        <div class="kanban-column" data-status="doing">
          <div class="column-header">
            <h2>🔨 Doing</h2>
            <span class="issue-count" id="count-doing">0</span>
          </div>
          <div class="column-body" id="column-doing"></div>
        </div>
        <div class="kanban-column" data-status="done">
          <div class="column-header">
            <h2>✅ Done</h2>
            <span class="issue-count" id="count-done">0</span>
          </div>
          <div class="column-body" id="column-done"></div>
        </div>
      </div>
    </main>
  `;

  vi.clearAllMocks();
});

describe('main()', () => {
  it('リポジトリ名が表示される', async () => {
    // fetch をモック
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map(),
      json: async () => [],
    });

    const { main } = (await import('../js/app.js'));
    await main();

    expect(document.getElementById('repo-display').textContent).toBe('test-owner/test-repo');
  });

  it('正常系: Issueを取得してカンバンボードをレンダリングする', async () => {
    const mockIssues = [
      { number: 1, title: 'Bug fix', state: 'open', labels: [], html_url: '#', updated_at: '2026-06-21T00:00:00Z', pull_request: undefined },
      { number: 2, title: 'Working', state: 'open', labels: [{ name: 'DOING', color: 'ff0000' }], html_url: '#', updated_at: '2026-06-21T00:00:00Z', pull_request: undefined },
    ];

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map(),
      json: async () => mockIssues,
    });

    const { main } = (await import('../js/app.js'));
    await main();

    // Incomingに1件、Doingに1件
    const incomingCards = document.querySelectorAll('#column-incoming .issue-card');
    const doingCards = document.querySelectorAll('#column-doing .issue-card');
    expect(incomingCards).toHaveLength(1);
    expect(doingCards).toHaveLength(1);
    expect(incomingCards[0].querySelector('.issue-number').textContent).toBe('#1');
  });

  it('異常系: APIエラー時にエラー表示される', async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { main } = (await import('../js/app.js'));
    await main();

    const errors = document.querySelectorAll('.error');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].textContent).toBe('Network error');
  });

  it('404エラー時に対応するメッセージが表示される', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const { main } = (await import('../js/app.js'));
    await main();

    const errors = document.querySelectorAll('.error');
    expect(errors[0].textContent).toContain('not found');
  });

  it('空のIssue一覧でもエラーにならない', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map(),
      json: async () => [],
    });

    const { main } = (await import('../js/app.js'));
    await main();

    // 各カラムに"No issues"と表示される
    const emptyStates = document.querySelectorAll('.empty-state');
    expect(emptyStates).toHaveLength(3);
    expect(emptyStates[0].textContent).toBe('No issues');
  });
});