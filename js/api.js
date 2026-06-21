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

  /**
   * Issue本文から関係性パターンを抽出する
   * @param {string} body - Issue本文
   * @returns {Object} { blockedBy: [number], blocking: [number], parent: number|null }
   */
  extractRelationshipsFromBody(body) {
    if (!body) {
      return { blockedBy: [], blocking: [], parent: null };
    }

    const result = {
      blockedBy: [],
      blocking: [],
      parent: null,
    };

    // blocked by #N
    const blockedByRegex = /blocked\s+by\s+#(\d+)/gi;
    let match;
    while ((match = blockedByRegex.exec(body)) !== null) {
      result.blockedBy.push(match[1]);
    }

    // blocking #N
    const blockingRegex = /blocking\s+#(\d+)/gi;
    while ((match = blockingRegex.exec(body)) !== null) {
      result.blocking.push(match[1]);
    }

    // parent #N
    const parentRegex = /parent\s+#(\d+)/i;
    const parentMatch = parentRegex.exec(body);
    if (parentMatch) {
      result.parent = parentMatch[1];
    }

    return result;
  },

  /**
   * ラベル名から関係性を抽出する
   * @param {Array} labels - ラベル配列
   * @returns {Object} { blockedBy: [number], blocking: [number], parent: number|null }
   */
  extractRelationshipsFromLabels(labels) {
    const result = {
      blockedBy: [],
      blocking: [],
      parent: null,
    };

    for (const label of labels) {
      const name = typeof label === 'string' ? label : label.name;

      // blocked-by-N
      const blockedByMatch = name.match(/^blocked-by-(\d+)$/);
      if (blockedByMatch) {
        result.blockedBy.push(blockedByMatch[1]);
        continue;
      }

      // blocking-N
      const blockingMatch = name.match(/^blocking-(\d+)$/);
      if (blockingMatch) {
        result.blocking.push(blockingMatch[1]);
        continue;
      }

      // parent-N
      const parentMatch = name.match(/^parent-(\d+)$/);
      if (parentMatch) {
        result.parent = parentMatch[1];
        continue;
      }
    }

    return result;
  },
};

// ESM / CJS / ブラウザ 全てでグローバルアクセス可能にする
globalThis.GitHubAPI = GitHubAPI;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GitHubAPI };
}