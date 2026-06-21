/**
 * IssuBoard - KanbanBoard のテスト
 */
import { describe, it, expect, beforeEach } from 'vitest';

// KanbanBoard が依存する GitHubAPI を事前に読み込む
import '../js/api.js';

// KanbanBoard を読み込む
const { KanbanBoard } = (await import('../js/kanban.js'));

describe('KanbanBoard', () => {
  describe('classifyIssues', () => {
    it('Open IssueはIncomingに分類される', () => {
      const issues = [
        { number: 1, title: 'Test', state: 'open', labels: [], state_reason: null },
      ];

      const result = KanbanBoard.classifyIssues(issues);

      expect(result.incoming).toHaveLength(1);
      expect(result.doing).toHaveLength(0);
      expect(result.done).toHaveLength(0);
    });

    it('DOINGラベルが付いたOpen IssueはDoingに分類される', () => {
      const issues = [
        { number: 1, title: 'Test', state: 'open', labels: [{ name: 'DOING', color: 'ff0000' }], state_reason: null },
      ];

      const result = KanbanBoard.classifyIssues(issues);

      expect(result.incoming).toHaveLength(0);
      expect(result.doing).toHaveLength(1);
      expect(result.done).toHaveLength(0);
    });

    it('Closed (completed) はDoneに分類される', () => {
      const issues = [
        { number: 1, title: 'Done Issue', state: 'closed', labels: [], state_reason: 'completed' },
      ];

      const result = KanbanBoard.classifyIssues(issues);

      expect(result.incoming).toHaveLength(0);
      expect(result.doing).toHaveLength(0);
      expect(result.done).toHaveLength(1);
    });

    it('Closed (not_planned) はどのカラムにも入らない', () => {
      const issues = [
        { number: 1, title: 'Wontfix', state: 'closed', labels: [], state_reason: 'not_planned' },
      ];

      const result = KanbanBoard.classifyIssues(issues);

      expect(result.incoming).toHaveLength(0);
      expect(result.doing).toHaveLength(0);
      expect(result.done).toHaveLength(0);
    });

    it('Closed (duplicate) はどのカラムにも入らない', () => {
      const issues = [
        { number: 1, title: 'Duplicate', state: 'closed', labels: [], state_reason: 'duplicate' },
      ];

      const result = KanbanBoard.classifyIssues(issues);

      expect(result.incoming).toHaveLength(0);
      expect(result.doing).toHaveLength(0);
      expect(result.done).toHaveLength(0);
    });

    it('複数のIssueを正しく振り分けられる', () => {
      const issues = [
        { number: 1, title: 'Incoming', state: 'open', labels: [], state_reason: null },
        { number: 2, title: 'Doing', state: 'open', labels: [{ name: 'DOING', color: 'ff0000' }], state_reason: null },
        { number: 3, title: 'Done', state: 'closed', labels: [], state_reason: 'completed' },
        { number: 4, title: 'Skipped', state: 'closed', labels: [], state_reason: 'not_planned' },
      ];

      const result = KanbanBoard.classifyIssues(issues);

      expect(result.incoming).toHaveLength(1);
      expect(result.doing).toHaveLength(1);
      expect(result.done).toHaveLength(1);
      expect(result.incoming[0].number).toBe(1);
      expect(result.doing[0].number).toBe(2);
      expect(result.done[0].number).toBe(3);
    });

    it('blocking関係が抽出される', () => {
      const issues = [
        { number: 1, title: 'Parent', state: 'open', labels: [], body: 'blocked by #2', state_reason: null },
        { number: 2, title: 'Blocker', state: 'open', labels: [], body: '', state_reason: null },
      ];

      const result = KanbanBoard.classifyIssues(issues);

      expect(result.incoming[0]._blockedBy).toEqual([2]);
      expect(result.incoming[1]._blockedBy).toEqual([]);
    });

  });

  describe('createCard', () => {
    beforeEach(() => {
      // テスト用のDOMをセットアップ
      document.body.innerHTML = '';
    });

    it('Issueカード要素を作成する', () => {
      const issue = {
        number: 42,
        title: 'Test Issue',
        state: 'open',
        html_url: 'https://github.com/o/r/issues/42',
        labels: [{ name: 'bug', color: 'd73a4a' }],
        updated_at: '2026-06-21T00:00:00Z',
      };

      const card = KanbanBoard.createCard(issue);

      expect(card).toBeInstanceOf(HTMLElement);
      expect(card.className).toBe('issue-card');
      expect(card.draggable).toBe(true);
      expect(card.dataset.issueNumber).toBe('42');

      // タイトルリンク
      const link = card.querySelector('.issue-title a');
      expect(link).not.toBeNull();
      expect(link.href).toBe(issue.html_url);
      expect(link.textContent).toBe('Test Issue');

      // ラベル
      const labelEl = card.querySelector('.issue-label');
      expect(labelEl).not.toBeNull();
      expect(labelEl.textContent).toBe('bug');

      // Issue番号
      const numEl = card.querySelector('.issue-number');
      expect(numEl).not.toBeNull();
      expect(numEl.textContent).toBe('#42');
    });

    it('ラベルがない場合もカードを作成できる', () => {
      const issue = {
        number: 1,
        title: 'No Labels',
        state: 'open',
        html_url: 'https://github.com/o/r/issues/1',
        labels: [],
        updated_at: '2026-06-21T00:00:00Z',
      };

      const card = KanbanBoard.createCard(issue);

      expect(card.querySelector('.issue-labels')).toBeNull();
    });
  });

  describe('render', () => {
    beforeEach(() => {
      // カンバンボードのDOMを構築
      document.body.innerHTML = `
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
      `;
    });

    it('各カラムにIssueカードをレンダリングする', () => {
      const classified = {
        incoming: [
          { number: 1, title: 'Incoming', state: 'open', html_url: '#', labels: [], updated_at: '2026-06-21T00:00:00Z' },
        ],
        doing: [
          { number: 2, title: 'Doing', state: 'open', html_url: '#', labels: [{ name: 'DOING', color: 'ff0000' }], updated_at: '2026-06-21T00:00:00Z' },
        ],
        done: [
          { number: 3, title: 'Done', state: 'closed', html_url: '#', labels: [], state_reason: 'completed', closed_at: '2026-06-21T00:00:00Z' },
        ],
      };

      KanbanBoard.render(classified);

      expect(document.getElementById('column-incoming').children).toHaveLength(1);
      expect(document.getElementById('column-doing').children).toHaveLength(1);
      expect(document.getElementById('column-done').children).toHaveLength(1);
      expect(document.getElementById('count-incoming').textContent).toBe('1');
      expect(document.getElementById('count-doing').textContent).toBe('1');
      expect(document.getElementById('count-done').textContent).toBe('1');
    });

    it('空のカラムには"No issues"と表示される', () => {
      const classified = {
        incoming: [],
        doing: [],
        done: [],
      };

      KanbanBoard.render(classified);

      const emptyStates = document.querySelectorAll('.empty-state');
      expect(emptyStates).toHaveLength(3);
      expect(emptyStates[0].textContent).toBe('No issues');
    });
  });

  describe('showLoading / showError', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="kanban-board">
          <div class="kanban-column" data-status="incoming">
            <div class="column-body" id="column-incoming"></div>
            <span class="issue-count" id="count-incoming">0</span>
          </div>
          <div class="kanban-column" data-status="doing">
            <div class="column-body" id="column-doing"></div>
            <span class="issue-count" id="count-doing">0</span>
          </div>
          <div class="kanban-column" data-status="done">
            <div class="column-body" id="column-done"></div>
            <span class="issue-count" id="count-done">0</span>
          </div>
        </div>
      `;
    });

    it('showLoadingでローディング表示になる', () => {
      KanbanBoard.showLoading();

      const loadings = document.querySelectorAll('.loading');
      expect(loadings).toHaveLength(3);
      expect(loadings[0].textContent).toBe('Loading...');
    });

    it('showErrorでエラー表示になる', () => {
      KanbanBoard.showError('Something went wrong');

      const errors = document.querySelectorAll('.error');
      expect(errors).toHaveLength(3);
      expect(errors[0].textContent).toBe('Something went wrong');

      // カウントが0になる
      expect(document.getElementById('count-incoming').textContent).toBe('0');
    });
  });
});