# GROWI MCPサーバー リファクタリング設計提案 (最終版)

## 1. はじめに

本提案は、GROWI MCPサーバーの現状の課題を解決し、保守性と拡張性を向上させるためのアーキテクチャ設計案です。

## 2. 現状の課題

*   `src/index.ts` へのツールの直接追加によるファイルの肥大化リスク。
*   `src/services/growi-service.ts` の機能追加に伴う肥大化リスク。

## 3. 目指す状態

*   ツールやリソースを1機能1ファイルのように分割し、管理しやすくする。
*   リクエストがあった際に初めて関連するツールやリソースを動的にロードする仕組みを導入し、パフォーマンスを向上させる。

## 4. 提案アーキテクチャ

### 4.1. ファイル・ディレクトリ構成案

```
/workspaces/growi-mcp-server/
├── src/
│   ├── index.ts                     # MCPサーバーの初期化と起動
│   ├── config/                      # 設定ファイル
│   │   ├── default.ts
│   │   └── types.ts
│   ├── services/                    # 外部サービス連携 (GrowiServiceなど)
│   │   ├── growi-service.ts
│   │   └── growi-api-error.ts
│   ├── tools/                       # MCPツール定義
│   │   ├── index.ts                 # ツールローダー
│   │   ├── getPage.ts               # getPageツール
│   │   └── (他のツール...).ts
│   ├── resources/                   # MCPリソース定義
│   │   ├── index.ts                 # リソースローダー
│   │   └── (リソース...).ts          # 例: growiPageResource.ts
│   ├── prompts/                     # MCPプロンプト定義
│   │   ├── index.ts                 # プロンプトローダー
│   │   └── (プロンプト...).ts        # 例: summarizePagePrompt.ts
│   └── core/                        # コア機能、共通ユーティリティ
│       ├── tool-definition.ts       # (任意) ツールの型定義など
│       ├── resource-definition.ts   # (任意) リソースの型定義など
│       └── prompt-definition.ts     # (任意) プロンプトの型定義など
├── package.json
└── tsconfig.json
```

### 4.2. `FastMCP` 標準機能を利用した登録アプローチ

**【重要】以下のサンプルコードについて**
ここに記載されているサンプルコードは、設計の意図を伝えるためのものであり、動作確認は行っていません。
実装時には、`FastMCP` の正確なAPI仕様や型定義、非同期処理の扱い、エラーハンドリングなどを十分に確認し、必要に応じて修正してください。特に、`GrowiService` のインスタンス化のタイミングや、各 `load` 関数の返り値の形式は、`FastMCP` のドキュメントや実際の動作に基づいて調整が必要です。

#### 4.2.1. ツールローダー (`src/tools/index.ts`)

各ツールファイル (例: `src/tools/getPage.ts`) は、`FastMCP` の `server` インスタンスを引数に取り、`server.addTool()` を呼び出して自身を登録する関数をエクスポートします。
`src/tools/index.ts` は、これらのツール定義ファイルをインポートし、エクスポートされた登録関数を `server` インスタンスを渡して実行します。

```typescript
// src/tools/getPage.ts
// 注意: このコードは設計意図を示すサンプルであり、動作未確認です。
import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { GrowiService } from '../services/growi-service.js';
import { isGrowiApiError } from '../services/growi-api-error.js';

const getPageSchema = z.object({
  pagePath: z.string().describe('Path of the page to retrieve'),
});

export function registerGetPageTool(server: FastMCP): void {
  const growiService = new GrowiService(); // インスタンス化のタイミングは要検討
  server.addTool({
    name: 'getPage',
    description: 'Get page information from GROWI',
    parameters: getPageSchema,
    execute: async (args: z.infer<typeof getPageSchema>) => {
      const { pagePath } = args;
      try {
        const page = await growiService.getPage(pagePath);
        return JSON.stringify(page); // 返り値の形式はFastMCPの仕様に合わせる
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to get page: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}
```

```typescript
// src/tools/index.ts
// 注意: このコードは設計意図を示すサンプルであり、動作未確認です。
import { FastMCP } from 'fastmcp';
import { registerGetPageTool } from './getPage.js';
// 他のツール定義ファイルをインポート
// import { registerAnotherTool } from './anotherTool.js';

export async function loadTools(server: FastMCP): Promise<void> {
  registerGetPageTool(server);
  // registerAnotherTool(server);
  console.log('All tools loaded and registered.');
}
```

#### 4.2.2. リソースローダー (`src/resources/index.ts`)

ツールと同様に、各リソースファイル (例: `src/resources/growiPageResource.ts`) は、`server.addResource()` または `server.addResourceTemplate()` を使用して自身を登録する関数をエクスポートします。
`src/resources/index.ts` がこれらの登録関数を呼び出します。

```typescript
// src/resources/growiPageResource.ts
// 注意: このコードは設計意図を示すサンプルであり、動作未確認です。
import { FastMCP } from 'fastmcp';
import { GrowiService } from '../services/growi-service.js';
import { IPage } from '@growi/core/dist/interfaces';

export function registerGrowiPageResource(server: FastMCP): void {
  const growiService = new GrowiService(); // インスタンス化のタイミングは要検討
  server.addResourceTemplate({
    uriTemplate: "growi://page/{pagePath}",
    name: "GROWI Page Content",
    mimeType: "application/json",
    arguments: [
      {
        name: "pagePath",
        description: "Path of the GROWI page",
        required: true,
      },
    ],
    async load({ pagePath }) { // pagePathの型を確認
      try {
        const page: IPage = await growiService.getPage(String(pagePath));
        return { text: JSON.stringify(page) }; // FastMCPのloadが期待する形式に合わせる
      } catch (error) {
        console.error(`Error loading GROWI page resource for path "${pagePath}":`, error);
        throw new Error(`Failed to load GROWI page: ${pagePath}`); // エラーハンドリングはFastMCPの仕様に合わせる
      }
    },
  });
}
```

```typescript
// src/resources/index.ts
// 注意: このコードは設計意図を示すサンプルであり、動作未確認です。
import { FastMCP } from 'fastmcp';
import { registerGrowiPageResource } from './growiPageResource.js';
// 他のリソース定義ファイルをインポート

export async function loadResources(server: FastMCP): Promise<void> {
  registerGrowiPageResource(server);
  console.log('All resources loaded and registered.');
}
```

#### 4.2.3. プロンプトローダー (`src/prompts/index.ts`)

ツールやリソースと同様に、各プロンプトファイル (例: `src/prompts/summarizePagePrompt.ts`) は、`server.addPrompt()` を使用して自身を登録する関数をエクスポートします。
`src/prompts/index.ts` がこれらの登録関数を呼び出します。

```typescript
// src/prompts/summarizePagePrompt.ts
// 注意: このコードは設計意図を示すサンプルであり、動作未確認です。
import { FastMCP } from 'fastmcp';

export function registerSummarizePagePrompt(server: FastMCP): void {
  server.addPrompt({
    name: "summarizeGrowiPage",
    description: "Summarize the content of a GROWI page.",
    arguments: [
      {
        name: "pageContent",
        description: "The content of the GROWI page to summarize.",
        required: true,
      },
      {
        name: "summaryLength",
        description: "Desired length of the summary (e.g., short, medium, long).",
        required: false,
        enum: ["short", "medium", "long"],
      }
    ],
    load: async (args) => {
      let prompt = `Please summarize the following page content:\n\n${args.pageContent}`;
      if (args.summaryLength) {
        prompt += `\n\nThe desired summary length is ${args.summaryLength}.`;
      }
      return prompt; // FastMCPのloadが期待する形式に合わせる
    },
  });
}
```

```typescript
// src/prompts/index.ts
// 注意: このコードは設計意図を示すサンプルであり、動作未確認です。
import { FastMCP } from 'fastmcp';
import { registerSummarizePagePrompt } from './summarizePagePrompt.js';
// 他のプロンプト定義ファイルをインポート

export async function loadPrompts(server: FastMCP): Promise<void> {
  registerSummarizePagePrompt(server);
  console.log('All prompts loaded and registered.');
}
```

#### 4.2.4. メインファイル (`src/index.ts`) の変更

`src/index.ts` は、各ローダー関数を呼び出して、ツール、リソース、プロンプトをサーバーに登録します。

```typescript
// src/index.ts
// 注意: このコードは設計意図を示すサンプルであり、動作未確認です。
import { FastMCP } from 'fastmcp';
import { loadTools } from './tools/index.js';
import { loadResources } from './resources/index.js';
import { loadPrompts } from './prompts/index.js';

const server = new FastMCP({
  name: 'growi-mcp-server',
  version: '1.0.0',
  // instructions: "GROWIと連携するMCPサーバーです。ページの取得や要約などが可能です。"
});

async function main(): Promise<void> {
  await loadTools(server);
  await loadResources(server);
  await loadPrompts(server);

  try {
    await server.start({
      transportType: 'stdio',
    });
    console.log('GROWI MCP Server started successfully.');
  } catch (error) {
    console.error('Failed to start GROWI MCP server:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error in main:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
```

### 4.3. 保守性向上のための設計上の考慮点
*   **責務の明確化:** `src/index.ts` はサーバー初期化と起動、各ローダー (`tools/index.ts` など) は対応する種類の定義ファイルの集約と登録呼び出し、個別の定義ファイル (`tools/getPage.ts` など) は具体的なツール・リソース・プロンプトのロジックと `FastMCP` への登録に専念します。
*   **型定義の活用:** `FastMCP` が提供する型や、必要に応じてプロジェクト固有の型定義 ([`src/core/`](src/core/:1) ディレクトリなど) を活用し、型安全性を確保します。
*   **依存性注入の検討:** `GrowiService` のような外部サービスへの依存は、各登録関数内でインスタンス化するのではなく、より上位でインスタンスを生成し、登録関数に渡す形 (DIコンテナの利用など) も検討できます。これによりテスト容易性が向上します。
*   **設定の分離:** [`src/config/default.ts`](src/config/default.ts:1) による設定管理を継続します。
*   **エラーハンドリング:** `FastMCP` のエラーハンドリング機構 (例: `UserError`) や、プロジェクト固有のエラー ([`GrowiApiError`](src/services/growi-api-error.ts:1) など) を適切に活用します。
*   **テスト容易性:** 各ツール・リソース・プロンプトの登録関数や、それらが内部で利用するロジックを個別にテストできるように意識します。

### 5. メリット・デメリットおよび実装難易度

#### 5.1. メリット
*   **保守性の向上:** 機能ごとのファイル分割により、コードの理解と修正が容易に。
*   **拡張性の向上:** 新規ツール・リソース・プロンプトの追加が既存コードへの影響を最小限に抑えて可能。
*   **可読性の向上:** 各ファイルの責務が明確になり、見通しが改善。
*   **`FastMCP` 標準準拠:** フレームワークの提供する標準的な方法で各要素を登録するため、一貫性が高く、将来的なフレームワークのアップデートにも追従しやすい。

#### 5.2. デメリット
*   **初期実装コスト:** ファイル構成変更や各登録関数の実装にコストが発生。
*   **`FastMCP` への依存:** フレームワークの仕様変更があった場合、追従が必要になる可能性。

#### 5.3. 予想される実装の難易度
*   **低～中程度:** `FastMCP` のAPIを理解し、各定義ファイルを作成する作業が主となる。

## 6. その他
*   [`src/services/growi-service.ts`](src/services/growi-service.ts:1) も機能が増えれば、責務に応じてさらなる分割を検討します。
*   ロギングライブラリの導入を推奨します。

## 7. まとめ

本提案のアーキテクチャにより、GROWI MCPサーバーは `FastMCP` フレームワークの標準機能を活用し、ツール、リソース、プロンプトを構造化された方法で管理・拡張できる、より堅牢で保守性の高いシステムとなることが期待されます。