# MCPによるコード実行：より効率的なエージェントの構築

*Engineering at Anthropic*

**直接的なツール呼び出しは、各定義と結果のためにコンテキストを消費します。エージェントはツールを直接呼び出す代わりにコードを書くことで、より効率的にスケールできます。MCPでの実現方法を解説します。**

*2025年11月4日公開*

---

[Model Context Protocol（MCP）](https://modelcontextprotocol.io/)は、AIエージェントを外部システムに接続するためのオープンスタンダードです。従来、エージェントをツールやデータに接続するには、各組み合わせごとにカスタム統合が必要でした。これにより断片化と重複作業が生じ、真に接続されたシステムをスケールすることが困難でした。MCPはユニバーサルなプロトコルを提供します。開発者がエージェントにMCPを一度実装すれば、統合のエコシステム全体が利用可能になります。

2024年11月にMCPをローンチして以来、採用は急速に進みました。コミュニティは数千のMCPサーバーを構築し、SDKは主要なプログラミング言語すべてで利用可能になり、業界はMCPをエージェントとツール・データを接続するためのデファクトスタンダードとして採用しています。

現在、開発者は数十のMCPサーバーにまたがる数百から数千のツールにアクセスできるエージェントを日常的に構築しています。しかし、接続されるツールの数が増えるにつれ、すべてのツール定義を最初に読み込み、中間結果をコンテキストウィンドウに渡すことで、エージェントの速度が低下し、コストが増加します。

このブログでは、コード実行によってエージェントがMCPサーバーとより効率的にやり取りし、より少ないトークンでより多くのツールを扱えるようになる方法を探ります。

---

## ツールからの過剰なトークン消費がエージェントの効率を低下させる

MCPの使用がスケールするにつれ、エージェントのコストとレイテンシを増加させる2つの一般的なパターンがあります：

1. ツール定義がコンテキストウィンドウを圧迫する
2. 中間的なツール結果が追加のトークンを消費する

### 1. ツール定義がコンテキストウィンドウを圧迫する

ほとんどのMCPクライアントは、すべてのツール定義を最初にコンテキストに直接読み込み、直接的なツール呼び出し構文を使用してモデルに公開します。これらのツール定義は次のようになります：

```
gdrive.getDocument
    Description: Retrieves a document from Google Drive
    Parameters:
            documentId (required, string): The ID of the
document to retrieve
            fields (optional, string): Specific fields to
return
    Returns: Document object with title, body content, metadata,
permissions, etc.
```

```
salesforce.updateRecord
    Description: Updates a record in Salesforce
    Parameters:
            objectType (required, string): Type of Salesforce
object (Lead, Contact, Account, etc.)
            recordId (required, string): The ID of the record to
update
            data (required, object): Fields to update with their
new values
    Returns: Updated record object with confirmation
```

ツールの説明はより多くのコンテキストウィンドウスペースを占有し、応答時間とコストを増加させます。エージェントが数千のツールに接続されている場合、リクエストを読む前に数十万トークンを処理する必要があります。

### 2. 中間的なツール結果が追加のトークンを消費する

ほとんどのMCPクライアントは、モデルがMCPツールを直接呼び出すことを許可しています。例えば、エージェントに「Google Driveから会議の議事録をダウンロードして、Salesforceのリードに添付して」と依頼するかもしれません。

モデルは次のような呼び出しを行います：

```
TOOL CALL: gdrive.getDocument(documentId: "abc123")
    → returns "Discussed Q4 goals...\n[full transcript text]"
      (loaded into model context)

TOOL CALL: salesforce.updateRecord(
                objectType: "SalesMeeting",
                recordId: "00Q5f000001abcXYZ",
                data: { "Notes": "Discussed Q4 goals...\n[full
transcript text written out]" }
            )
      (model needs to write entire transcript into context
again)
```

すべての中間結果はモデルを通過する必要があります。この例では、通話の完全な議事録が2回流れます。2時間の営業会議の場合、追加で50,000トークンを処理することになりかねません。さらに大きなドキュメントはコンテキストウィンドウの制限を超え、ワークフローが破綻する可能性があります。

大きなドキュメントや複雑なデータ構造では、ツール呼び出し間でデータをコピーする際にモデルがミスをする可能性が高くなります。

> MCPクライアントはツール定義をモデルのコンテキストウィンドウに読み込み、各ツール呼び出しと結果が操作間でモデルを通過するメッセージループを調整します。

---

## MCPによるコード実行はコンテキスト効率を向上させる

コード実行環境がエージェントにとってより一般的になるにつれ、解決策はMCPサーバーを直接的なツール呼び出しではなくコードAPIとして提示することです。エージェントはMCPサーバーとやり取りするためのコードを書くことができます。このアプローチは両方の課題に対処します：エージェントは必要なツールだけを読み込み、結果をモデルに渡す前に実行環境でデータを処理できます。

これを行う方法はいくつかあります。1つのアプローチは、接続されたMCPサーバーからすべての利用可能なツールのファイルツリーを生成することです。TypeScriptを使用した実装例を示します：

```
servers
├── google-drive
│   ├── getDocument.ts
│   ├── ... (other tools)
│   └── index.ts
├── salesforce
│   ├── updateRecord.ts
│   ├── ... (other tools)
│   └── index.ts
└── ... (other servers)
```

各ツールは次のようなファイルに対応します：

```typescript
// ./servers/google-drive/getDocument.ts
import { callMCPTool } from "../../../client.js";

interface GetDocumentInput {
  documentId: string;
}

interface GetDocumentResponse {
  content: string;
}

/* Read a document from Google Drive */
export async function getDocument(input: GetDocumentInput):
Promise<GetDocumentResponse> {
  return callMCPTool<GetDocumentResponse>
('google_drive__get_document', input);
}
```

上記のGoogle DriveからSalesforceへの例は、次のコードになります：

```typescript
// Read transcript from Google Docs and add to Salesforce prospect
import * as gdrive from './servers/google-drive';
import * as salesforce from './servers/salesforce';

const transcript = (await gdrive.getDocument({ documentId: 'abc123'
})).content;

await salesforce.updateRecord({
  objectType: 'SalesMeeting',
  recordId: '00Q5f000001abcXYZ',
  data: { Notes: transcript }
});
```

エージェントはファイルシステムを探索してツールを発見します：`./servers/`ディレクトリをリストして利用可能なサーバー（`google-drive`や`salesforce`など）を見つけ、次に必要な特定のツールファイル（`getDocument.ts`や`updateRecord.ts`など）を読んで各ツールのインターフェースを理解します。これにより、エージェントは現在のタスクに必要な定義だけを読み込むことができます。

これにより、トークン使用量が150,000トークンから2,000トークンに削減されます—**98.7%の時間とコストの節約**です。

Cloudflareも同様の調査結果を発表しており、MCPによるコード実行を「Code Mode」と呼んでいます。核心的な洞察は同じです：LLMはコードを書くことに長けており、開発者はこの強みを活用して、MCPサーバーとより効率的にやり取りするエージェントを構築すべきです。

---

## MCPによるコード実行のメリット

MCPによるコード実行は、ツールをオンデマンドで読み込み、データがモデルに到達する前にフィルタリングし、複雑なロジックを単一ステップで実行することで、エージェントがコンテキストをより効率的に使用できるようにします。このアプローチを使用することで、セキュリティと状態管理のメリットもあります。

### プログレッシブ・ディスクロージャー（段階的開示）

モデルはファイルシステムのナビゲーションに優れています。ツールをファイルシステム上のコードとして提示することで、モデルは最初にすべてを読むのではなく、オンデマンドでツール定義を読むことができます。

あるいは、`search_tools`ツールをサーバーに追加して関連する定義を見つけることもできます。例えば、上記で使用した仮想のSalesforceサーバーを操作する場合、エージェントは「salesforce」を検索し、現在のタスクに必要なツールだけを読み込みます。`search_tools`ツールに詳細レベルパラメータを含めて、エージェントが必要な詳細レベル（名前のみ、名前と説明、またはスキーマを含む完全な定義など）を選択できるようにすることも、エージェントがコンテキストを節約し、ツールを効率的に見つけるのに役立ちます。

### コンテキスト効率の高いツール結果

大規模なデータセットを扱う場合、エージェントはコードで結果をフィルタリングおよび変換してから返すことができます。10,000行のスプレッドシートを取得する場合を考えてみましょう：

```typescript
// Without code execution - all rows flow through context
TOOL CALL: gdrive.getSheet(sheetId: 'abc123')
    → returns 10,000 rows in context to filter manually

// With code execution - filter in the execution environment
const allRows = await gdrive.getSheet({ sheetId: 'abc123' });
const pendingOrders = allRows.filter(row =>
  row["Status"] === 'pending'
);
console.log(`Found ${pendingOrders.length} pending orders`);
console.log(pendingOrders.slice(0, 5)); // Only log first 5 for
review
```

エージェントは10,000行ではなく5行だけを見ます。同様のパターンは、集計、複数のデータソース間の結合、または特定のフィールドの抽出にも機能します—すべてコンテキストウィンドウを膨らませることなく。

### より強力でコンテキスト効率の高い制御フロー

ループ、条件分岐、エラー処理は、個々のツール呼び出しを連鎖させるのではなく、使い慣れたコードパターンで行うことができます。例えば、Slackでデプロイ通知が必要な場合、エージェントは次のように書けます：

```typescript
let found = false;
while (!found) {
  const messages = await slack.getChannelHistory({ channel:
'C123456' });
  found = messages.some(m => m.text.includes('deployment
complete'));
  if (!found) await new Promise(r => setTimeout(r, 5000));
}
console.log('Deployment notification received');
```

このアプローチは、エージェントループを通じてMCPツール呼び出しとスリープコマンドを交互に行うよりも効率的です。

さらに、実行される条件分岐ツリーを書き出すことができると、「最初のトークンまでの時間」のレイテンシも節約できます：モデルがif文を評価するのを待つのではなく、エージェントはコード実行環境にこれを任せることができます。

### プライバシーを保護する操作

エージェントがMCPでコード実行を使用する場合、中間結果はデフォルトで実行環境に留まります。このように、エージェントは明示的にログまたは返却したものだけを見ることになり、モデルと共有したくないデータはモデルのコンテキストに入ることなくワークフローを流れることができます。

さらに機密性の高いワークロードでは、エージェントハーネスが機密データを自動的にトークン化できます。例えば、スプレッドシートから顧客の連絡先詳細をSalesforceにインポートする必要があるとします。エージェントは次のように書きます：

```typescript
const sheet = await gdrive.getSheet({ sheetId: 'abc123' });
for (const row of sheet.rows) {
  await salesforce.updateRecord({
    objectType: 'Lead',
    recordId: row.salesforceId,
    data: {
      Email: row.email,
      Phone: row.phone,
      Name: row.name
    }
  });
}
console.log(`Updated ${sheet.rows.length} leads`);
```

MCPクライアントはデータを傍受し、モデルに到達する前にPIIをトークン化します：

```typescript
// What the agent would see, if it logged the sheet.rows:
[
  { salesforceId: '00Q...', email: '[EMAIL_1]', phone: '[PHONE_1]',
name: '[NAME_1]' },
  { salesforceId: '00Q...', email: '[EMAIL_2]', phone: '[PHONE_2]',
name: '[NAME_2]' },
  ...
]
```

そして、データが別のMCPツール呼び出しで共有されると、MCPクライアントでの参照を介してトークン化が解除されます。実際のメールアドレス、電話番号、名前はGoogle SheetsからSalesforceに流れますが、モデルを通過することはありません。これにより、エージェントが誤って機密データをログに記録したり処理したりすることを防ぎます。これを使用して、データがどこから、どこへ流れることができるかを選択する決定論的なセキュリティルールを定義することもできます。

### 状態の永続化とスキル

ファイルシステムアクセスを伴うコード実行により、エージェントは操作間で状態を維持できます。エージェントは中間結果をファイルに書き込むことができ、作業の再開と進捗の追跡が可能になります：

```typescript
const leads = await salesforce.query({
  query: 'SELECT Id, Email FROM Lead LIMIT 1000'
});
const csvData = leads.map(l => `${l.Id},${l.Email}`).join('\n');
await fs.writeFile('./workspace/leads.csv', csvData);

// Later execution picks up where it left off
const saved = await fs.readFile('./workspace/leads.csv', 'utf8');
```

エージェントは自分自身のコードを再利用可能な関数として永続化することもできます。エージェントがタスクのための動作するコードを開発したら、その実装を将来の使用のために保存できます：

```typescript
// In ./skills/save-sheet-as-csv.ts
import * as gdrive from './servers/google-drive';

export async function saveSheetAsCsv(sheetId: string) {
  const data = await gdrive.getSheet({ sheetId });
  const csv = data.map(row => row.join(',')).join('\n');
  await fs.writeFile(`./workspace/sheet-${sheetId}.csv`, csv);
  return `./workspace/sheet-${sheetId}.csv`;
}

// Later, in any agent execution:
import { saveSheetAsCsv } from './skills/save-sheet-as-csv';
const csvPath = await saveSheetAsCsv('abc123');
```

これは、専門的なタスクでモデルのパフォーマンスを向上させるための再利用可能な指示、スクリプト、リソースのフォルダである[Skills](https://docs.anthropic.com/en/docs/claude-code/skills)の概念と密接に関連しています。これらの保存された関数にSKILL.mdファイルを追加すると、モデルが参照して使用できる構造化されたスキルが作成されます。時間の経過とともに、これによりエージェントは高レベルの機能のツールボックスを構築し、最も効果的に作業するために必要なスキャフォールディングを進化させることができます。

コード実行には独自の複雑さも伴うことに注意してください。エージェントが生成したコードを実行するには、適切な[サンドボックス化](https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks#code-sandboxing)、リソース制限、監視を備えた安全な実行環境が必要です。これらのインフラストラクチャ要件は、直接的なツール呼び出しでは回避できる運用上のオーバーヘッドとセキュリティの考慮事項を追加します。コード実行のメリット—トークンコストの削減、レイテンシの低減、ツール構成の改善—は、これらの実装コストと比較検討する必要があります。

---

## まとめ

MCPは、エージェントが多くのツールやシステムに接続するための基盤となるプロトコルを提供します。しかし、あまりにも多くのサーバーが接続されると、ツール定義と結果が過剰なトークンを消費し、エージェントの効率が低下します。

ここでの問題の多くは新しく感じられますが—コンテキスト管理、ツール構成、状態の永続化—ソフトウェアエンジニアリングからの既知の解決策があります。コード実行は、これらの確立されたパターンをエージェントに適用し、使い慣れたプログラミング構造を使用してMCPサーバーとより効率的にやり取りできるようにします。このアプローチを実装する場合は、[MCPコミュニティ](https://github.com/modelcontextprotocol)で発見を共有することをお勧めします。

---

## 謝辞

*この記事はAdam JonesとConor Kellyによって執筆されました。この投稿の草稿に対するフィードバックをいただいたJeremy Fox、Jerome Swannack、Stuart Ritchie、Molly Vorwerck、Matt Samuels、Maggie Voに感謝します。*

---

*© 2025 Anthropic PBC*

*原文: https://www.anthropic.com/engineering/code-execution-with-mcp*
