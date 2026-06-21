/**
 * IssuBoard - Kanban board rendering & drag-and-drop
 */
const KanbanBoard = {
  /**
   * Issueをカラムに振り分ける
   * @param {Array} issues - GitHub APIから取得したIssue配列
   * @returns {Object} カラムIDをキーとしたIssue配列
   */
  classifyIssues(issues) {
    const classified = {
      incoming: [],
      doing: [],
      done: [],
    };

    const doingLabel = CONFIG.doingLabel;

    // 関係性マップを作成（キーを文字列に統一）
    const issueMap = new Map();
    for (const issue of issues) {
      issueMap.set(String(issue.number), issue);
    }

    for (const issue of issues) {
      // 関係性情報を初期化
      issue._blockedBy = [];
      issue._blockingTargets = [];
      issue._parent = null;

      // Closed: completed のみ Done に表示、それ以外は非表示
      if (issue.state === 'closed') {
        if (issue.state_reason === 'completed') {
          classified.done.push(issue);
        }
        // not_planned, duplicate, null はスキップ
        continue;
      }

      // Open: DOINGラベルの有無で振り分け
      const issueLabelNames = issue.labels.map(l => (typeof l === 'string' ? l : l.name));
      const hasDoingLabel = issueLabelNames.includes(doingLabel);

      if (hasDoingLabel) {
        classified.doing.push(issue);
      } else {
        classified.incoming.push(issue);
      }
    }

    // 関係性を抽出（本文とラベルの両方から）
    for (const issue of issues) {
      // 本文から抽出
      const bodyRelationships = GitHubAPI.extractRelationshipsFromBody(issue.body);
      // ラベルから抽出
      const labelRelationships = GitHubAPI.extractRelationshipsFromLabels(issue.labels);

      // マージ（重複を除く）
      const blockedBySet = new Set([
        ...bodyRelationships.blockedBy,
        ...labelRelationships.blockedBy,
      ]);
      const blockingSet = new Set([
        ...bodyRelationships.blocking,
        ...labelRelationships.blocking,
      ]);

      issue._blockedBy = Array.from(blockedBySet).filter(num => {
        const blocker = issueMap.get(String(num));
        return blocker && blocker.state === 'open';
      });
      issue._blockingTargets = Array.from(blockingSet);
      issue._parent = bodyRelationships.parent || labelRelationships.parent;
    }

    // blockingの逆引きを計算（Aがblocked by B → BはAをblockしている）
    for (const issue of issues) {
      for (const blockerNum of issue._blockedBy) {
        const blocker = issueMap.get(String(blockerNum));
        if (blocker) {
          blocker._blockingTargets = blocker._blockingTargets || [];
          if (!blocker._blockingTargets.includes(issue.number)) {
            blocker._blockingTargets.push(issue.number);
          }
        }
      }
    }

    // 子Issueの逆引きを計算（AのparentがB → Bの子はA）
    for (const issue of issues) {
      if (issue._parent) {
        const parent = issueMap.get(String(issue._parent));
        if (parent) {
          parent._children = parent._children || [];
          if (!parent._children.includes(issue.number)) {
            parent._children.push(issue.number);
          }
        }
      }
    }

    // issueMapをKanbanBoardに一時保存（createCardで使用）
    KanbanBoard._issueMap = issueMap;

    return classified;
  },

  /**
   * カンバンボードをレンダリングする
   * @param {Object} classified - classifyIssues() の結果
   */
  render(classified) {
    for (const [columnId, issues] of Object.entries(classified)) {
      const columnBody = document.getElementById(`column-${columnId}`);
      const countEl = document.getElementById(`count-${columnId}`);

      if (!columnBody) continue;

      // Issueカウント更新
      if (countEl) {
        countEl.textContent = String(issues.length);
      }

      // カードをクリア
      columnBody.innerHTML = '';

      if (issues.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-state';
        emptyMsg.textContent = 'No issues';
        columnBody.appendChild(emptyMsg);
        continue;
      }

      // 各Issueのカードを作成
      for (const issue of issues) {
        const card = this.createCard(issue);
        columnBody.appendChild(card);
      }
    }

    // クリーンアップ
    delete KanbanBoard._issueMap;
  },

  /**
   * 1つのIssueカード要素を作成する
   * @param {Object} issue - GitHub APIのIssueオブジェクト
   * @returns {HTMLElement}
   */
  createCard(issue) {
    const card = document.createElement('div');
    card.className = 'issue-card';
    card.draggable = true;
    card.dataset.issueNumber = String(issue.number);

    // タイトル
    const titleEl = document.createElement('div');
    titleEl.className = 'issue-title';
    const link = document.createElement('a');
    link.href = issue.html_url;
    link.target = '_blank';
    link.textContent = issue.title;
    titleEl.appendChild(link);
    card.appendChild(titleEl);

    // ラベル
    if (issue.labels && issue.labels.length > 0) {
      const labelsEl = document.createElement('div');
      labelsEl.className = 'issue-labels';
      for (const label of issue.labels) {
        const name = typeof label === 'string' ? label : label.name;
        const color = typeof label === 'string' ? '0366d6' : (label.color || '0366d6');
        const labelEl = document.createElement('span');
        labelEl.className = 'issue-label';
        labelEl.textContent = name;
        labelEl.style.backgroundColor = `#${color}`;
        // 色によって文字色を調整
        const r = parseInt(color.slice(0, 2), 16);
        const g = parseInt(color.slice(2, 4), 16);
        const b = parseInt(color.slice(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        labelEl.style.color = brightness > 128 ? '#000' : '#fff';
        labelsEl.appendChild(labelEl);
      }
      card.appendChild(labelsEl);
    }

    // 関係性バッジ（親子関係 + blocking関係）
    const relationEl = document.createElement('div');
    relationEl.className = 'issue-relations';

    // 親Issue表示
    if (issue._parent && KanbanBoard._issueMap && KanbanBoard._issueMap.get(issue._parent)) {
      const parentEl = document.createElement('span');
      parentEl.className = 'relation-badge parent';
      parentEl.textContent = `👶 #${issue._parent}`;
      parentEl.title = 'parent issue';
      relationEl.appendChild(parentEl);
    }

    // 子Issue表示
    if (issue._children && issue._children.length > 0) {
      const childEl = document.createElement('span');
      childEl.className = 'relation-badge child';
      childEl.textContent = `👣 #${issue._children.join(', #')}`;
      childEl.title = 'child issues';
      relationEl.appendChild(childEl);
    }

    // blocked-by表示
    if (issue._blockedBy && issue._blockedBy.length > 0) {
      const blockedEl = document.createElement('span');
      blockedEl.className = 'relation-badge blocked-by';
      blockedEl.textContent = `🚫 #${issue._blockedBy.join(', #')}`;
      blockedEl.title = 'blocked by';
      relationEl.appendChild(blockedEl);
    }

    // blocking表示
    if (issue._blockingTargets && issue._blockingTargets.length > 0) {
      const blockingEl = document.createElement('span');
      blockingEl.className = 'relation-badge blocking';
      blockingEl.textContent = `🔴 #${issue._blockingTargets.join(', #')}`;
      blockingEl.title = 'blocking';
      relationEl.appendChild(blockingEl);
    }

    if (relationEl.children.length > 0) {
      card.appendChild(relationEl);
    }

    // メタ情報（Issue番号 & Closedの場合は完了日）
    const metaEl = document.createElement('div');
    metaEl.className = 'issue-meta';
    const numEl = document.createElement('span');
    numEl.className = 'issue-number';
    numEl.textContent = `#${issue.number}`;
    metaEl.appendChild(numEl);

    const dateEl = document.createElement('span');
    const date = issue.state === 'closed' ? new Date(issue.closed_at) : new Date(issue.updated_at);
    dateEl.textContent = date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
    metaEl.appendChild(dateEl);
    card.appendChild(metaEl);

    // ドラッグイベント
    this._attachDragEvents(card);

    // 関係性ハイライトイベント
    this._attachRelationHoverEvents(card, issue);

    return card;
  },

  /**
   * ドラッグ&ドロップイベントをカードにアタッチ
   */
  _attachDragEvents(card) {
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.dataset.issueNumber);
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      // 全カラムのドラッグオーバー表示を消す
      document.querySelectorAll('.column-body.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
    });
  },

  /**
   * 関係性ハイライトのマウスイベントをカードにアタッチ
   */
  _attachRelationHoverEvents(card, issue) {
    const relatedNumbers = new Set();
    let selfHighlightClass = null;

    // 自分自身のハイライトクラスを決定
    if (issue._blockedBy && issue._blockedBy.length > 0) {
      selfHighlightClass = 'relation-highlight-blocked';
    } else if (issue._blockingTargets && issue._blockingTargets.length > 0) {
      selfHighlightClass = 'relation-highlight-blocker';
    } else if (issue._parent) {
      selfHighlightClass = 'relation-highlight-child';
    }

    // 関連Issueの番号を収集
    if (issue._blockedBy) {
      issue._blockedBy.forEach(n => relatedNumbers.add(String(n)));
    }
    if (issue._blockingTargets) {
      issue._blockingTargets.forEach(n => relatedNumbers.add(String(n)));
    }
    if (issue._parent) {
      relatedNumbers.add(String(issue._parent));
    }
    if (issue._children) {
      issue._children.forEach(n => relatedNumbers.add(String(n)));
    }

    if (relatedNumbers.size === 0 && !selfHighlightClass) return;

    card.addEventListener('mouseenter', () => {
      // 自分自身をハイライト
      if (selfHighlightClass) {
        card.classList.add(selfHighlightClass);
      }

      // 関連カードをハイライト
      for (const num of relatedNumbers) {
        const relatedCard = document.querySelector(`.issue-card[data-issue-number="${num}"]`);
        if (relatedCard) {
          if (issue._blockedBy && issue._blockedBy.map(String).includes(num)) {
            relatedCard.classList.add('relation-highlight-blocker');
          } else if (issue._blockingTargets && issue._blockingTargets.map(String).includes(num)) {
            relatedCard.classList.add('relation-highlight-blocked');
          } else if (issue._parent && String(issue._parent) === num) {
            relatedCard.classList.add('relation-highlight-parent');
          } else if (issue._children && issue._children.map(String).includes(num)) {
            relatedCard.classList.add('relation-highlight-child');
          }
        }
      }
    });

    card.addEventListener('mouseleave', () => {
      // 自分自身のハイライトを解除
      if (selfHighlightClass) {
        card.classList.remove(selfHighlightClass);
      }
      // 関連カードのハイライトを解除
      document.querySelectorAll('.relation-highlight-blocker, .relation-highlight-blocked, .relation-highlight-parent, .relation-highlight-child')
        .forEach(el => {
          el.classList.remove('relation-highlight-blocker', 'relation-highlight-blocked', 'relation-highlight-parent', 'relation-highlight-child');
        });
    });
  },

  /**
   * カラムにドロップイベントを設定する
   * @param {Function} onDrop - (issueNumber, targetColumnId) を受け取るコールバック
   */
  setupDropZones(onDrop) {
    const columns = document.querySelectorAll('.column-body');

    columns.forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        column.classList.add('drag-over');
      });

      column.addEventListener('dragleave', () => {
        column.classList.remove('drag-over');
      });

      column.addEventListener('drop', (e) => {
        e.preventDefault();
        column.classList.remove('drag-over');
        const issueNumber = e.dataTransfer.getData('text/plain');
        const targetColumn = column.closest('.kanban-column');
        const targetColumnId = targetColumn ? targetColumn.dataset.status : null;

        if (issueNumber && targetColumnId && onDrop) {
          onDrop(issueNumber, targetColumnId);
        }
      });
    });
  },

  /**
   * ローディング表示
   */
  showLoading() {
    for (const columnId of Object.keys(CONFIG.columns)) {
      const columnBody = document.getElementById(`column-${columnId}`);
      if (columnBody) {
        columnBody.innerHTML = '<div class="loading">Loading...</div>';
      }
    }
  },

  /**
   * エラー表示
   * @param {string} message
   */
  showError(message) {
    for (const columnId of Object.keys(CONFIG.columns)) {
      const columnBody = document.getElementById(`column-${columnId}`);
      if (columnBody) {
        columnBody.innerHTML = `<div class="error">${message}</div>`;
      }
      const countEl = document.getElementById(`count-${columnId}`);
      if (countEl) countEl.textContent = '0';
    }
  },
};

// ESM / CJS / ブラウザ 全てでグローバルアクセス可能にする
globalThis.KanbanBoard = KanbanBoard;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KanbanBoard };
}