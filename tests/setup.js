/**
 * IssuBoard - Test setup
 * テスト実行前にグローバルな設定とDOMを準備する
 */
import { JSDOM } from 'jsdom';
import { vi } from 'vitest';

// Vitest実行中フラグ（app.jsの自動実行を防ぐ）
globalThis.__VITEST__ = true;

// テスト用のCONFIG
globalThis.CONFIG = {
  owner: 'test-owner',
  repo: 'test-repo',
  doingLabel: 'DOING',
  columns: {
    incoming: { title: '📥 Incoming' },
    doing: { title: '🔨 Doing' },
    done: { title: '✅ Done' },
  },
  perPage: 100,
};

// JSDOMでHTMLをセットアップ
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

globalThis.document = dom.window.document;
globalThis.window = dom.window;
globalThis.navigator = dom.window.navigator;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLAnchorElement = dom.window.HTMLAnchorElement;
globalThis.DataTransfer = dom.window.DataTransfer;
globalThis.DragEvent = dom.window.DragEvent;
globalThis.MouseEvent = dom.window.MouseEvent;

// fetch のモック
globalThis.fetch = vi.fn();