/**
 * IssuBoard - GitHubAPI のテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// GitHubAPI を読み込む
const { GitHubAPI } = (await import('../js/api.js'));

describe('GitHubAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchIssues', () => {
    it('正常にIssue一覧を取得できる', async () => {
      const mockIssues = [
        { number: 1, title: 'Issue 1', state: 'open', labels: [], pull_request: undefined },
        { number: 2, title: 'Issue 2', state: 'closed', labels: [], pull_request: undefined },
      ];

      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        json: async () => mockIssues,
      });

      const issues = await GitHubAPI.fetchIssues('owner', 'repo', 100);

      expect(issues).toHaveLength(2);
      expect(issues[0].number).toBe(1);
      expect(issues[1].number).toBe(2);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('Pull Requestは除外される', async () => {
      const mockIssues = [
        { number: 1, title: 'Issue', state: 'open', labels: [], pull_request: undefined },
        { number: 2, title: 'PR', state: 'open', labels: [], pull_request: { url: 'https://...' } },
      ];

      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        json: async () => mockIssues,
      });

      const issues = await GitHubAPI.fetchIssues('owner', 'repo', 100);

      expect(issues).toHaveLength(1);
      expect(issues[0].number).toBe(1);
    });

    it('404エラー時に適切なメッセージを投げる', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(GitHubAPI.fetchIssues('unknown', 'repo', 100))
        .rejects
        .toThrow('Repository "unknown/repo" not found.');
    });

    it('403エラー時にレート制限メッセージを投げる', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(GitHubAPI.fetchIssues('owner', 'repo', 100))
        .rejects
        .toThrow('API rate limit exceeded. Please try again later.');
    });

    it('ページネーションに対応している', async () => {
      const page1 = [{ number: 1, title: 'Page1', state: 'open', labels: [], pull_request: undefined }];
      const page2 = [{ number: 2, title: 'Page2', state: 'open', labels: [], pull_request: undefined }];

      // 1ページ目: Linkヘッダーで次のページあり
      const headers1 = new Map();
      headers1.set('Link', '<https://api.github.com/repos/o/r/issues?page=2>; rel="next"');

      globalThis.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: headers1,
          json: async () => page1,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map(),
          json: async () => page2,
        });

      const issues = await GitHubAPI.fetchIssues('o', 'r', 100);

      expect(issues).toHaveLength(2);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });
});