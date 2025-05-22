import type { FastMCP } from 'fastmcp';
import { registerGrowiPageResource } from './growiPageResource.js';
// 将来的に他のリソース定義ファイルをここにインポート
// import { registerAnotherResource } from './anotherResource.js';

export async function loadResources(server: FastMCP): Promise<void> {
  // 現在のリソース登録
  registerGrowiPageResource(server);

  // 将来的に他のリソース登録関数をここに追加
  // registerAnotherResource(server);

  console.log('All resources loaded and registered.');
}
