import type { FastMCP } from 'fastmcp';
import { registerSummarizePagePrompt } from './summarizePagePrompt.js';
// 他のプロンプト定義ファイルをインポート可能

export async function loadPrompts(server: FastMCP): Promise<void> {
  // 各プロンプトの登録
  registerSummarizePagePrompt(server);
  // 将来的に他のプロンプトの登録を追加可能
  // 例: await registerAnotherPrompt(server);
}
