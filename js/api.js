/**
 * IssuBoard - GitHub API client
 * 公開リポジトリのIssuesを取得する
 */
const GitHubAPI = {
  /**
   * 指定リポジトリの全Issueを取得する（未認証・公開リポジトリのみ）
   * @param {string} owner - リポジトリオーナー
   * @param {string} repo - リポジトリ名
   * @param {number} perPage - 1ページあたりの件数（最大100）
   * @returns {Promise<Array>} Issueの配列
   */
  async fetchIssues(owner, repo, perPage = 100) {
    const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`;
    const params = new URLSearchParams({
      state: 'all',
      per_page: String(perPage),
      sort: 'created',
      direction: 'desc',
    });

    let allIssues = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      params.set('page', String(page));
      const url = `${baseUrl}?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Repository "${owner}/${repo}" not found.`);
        }
        if (response.status === 403) {
          throw new Error('API rate limit exceeded. Please try again later.');
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const issues = await response.json();
      allIssues = allIssues.concat(issues);

      // ページネーション: Linkヘッダーで次のページがあるか確認
      const linkHeader = response.headers.get('Link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        page++;
      } else {
        hasMore = false;
      }

      // 安全のため最大10ページまで
      if (page > 10) break;
    }

    // Pull Requestは除外（Issues APIはPRも含む）
    return allIssues.filter(issue => !issue.pull_request);
  },
};

// ESM / CJS / ブラウザ 全てでグローバルアクセス可能にする
globalThis.GitHubAPI = GitHubAPI;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GitHubAPI };
}
