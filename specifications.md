# VS Code Mind Map 拡張機能 仕様書

## 1. 概要
VS Code 上でマインドマップを作成・編集するための拡張機能です。
描画および操作のコアライブラリとして **mind-elixir** を使用します。

## 2. 技術スタック
- **VS Code Extension API**: Custom Text Editor Provider (`CustomTextEditorProvider`) を使用。
- **Webview**: マインドマップの UI を表示。
- **Core Library**: `mind-elixir` (JavaScript) を使用してマインドマップのレンダリングと操作を行う。
- **Communication**: VS Code ホストと Webview 間でメッセージパッシングを行い、データの同期を取る。

## 3. 機能要件

### 3.1. マインドマップの表示
- `.mm` または `.mindmap` ファイルを開くと、グラフィカルなマインドマップが表示されること。
- `mind-elixir` の標準的な機能（ノードの展開・折りたたみ、ドラッグ＆ドロップなど）が利用可能であること。
- テーマの適用（`mind-elixir` がサポートする場合）。

### 3.2. マインドマップの編集
- **ノード操作**:
  - ルートノードの編集。
  - 子ノードの追加・削除。
  - 兄弟ノードの追加。
  - ノードテキストの編集。
  - **ノードスタイルの変更**:
    - フォントサイズ
    - 文字色
    - 太字
    - 斜体
- **操作性**:
  - キーボードショートカット（Tab で子ノード追加、Enter で兄弟ノード追加など `mind-elixir` のデフォルトに準拠）。
  - コンテキストメニュー（右クリック）による操作。

### 3.3. データの保存と同期
- Webview 上での変更を検知し、リアルタイムまたは保存時に VS Code のドキュメントモデルへ反映する。
- VS Code 側でファイルが変更された場合（外部変更や undo/redo）、Webview 側の表示を更新する。
- **データ形式**:
  - `mind-elixir` のネイティブ JSON フォーマットを使用することを基本とする。
  - `.mm` (FreeMind 形式) のサポートが必要な場合は、変換ロジックを実装する（※現状は JSON ベースを推奨）。

## 4. アーキテクチャ設計

### 4.1. MindMapEditorProvider (Extension Host)
- `vscode.CustomTextEditorProvider` を実装。
- ドキュメントの変更を監視 (`onDidChangeTextDocument`) し、Webview へ `update` メッセージを送信。
- Webview からの変更メッセージを受け取り、`WorkspaceEdit` を適用してファイルを更新。

### 4.2. Webview (Frontend)
- `index.html` に `mind-elixir` のコンテナ (`#map`) を配置。
- `main.js` にて `MindElixir` インスタンスを初期化。
- VS Code API (`acquireVsCodeApi`) を使用して状態管理。
- `window.addEventListener('message', ...)` でホストからのデータを受け取り `mind.init(data)` または `mind.refresh(data)` を実行。
- データ変更イベント (`mind.bus.on('operation', ...)` 等) をフックし、ホストへ新しいデータを送信。

## 5. UI/UX
- VS Code のネイティブなルック＆フィールに馴染むデザイン。
- ダークモード/ライトモードの対応（VS Code のテーマ変数を CSS で利用可能か検討）。

## 6. 今後の展望 (Optional)
- 複数のルートノードのサポート。
- 画像やリンクの埋め込み。
- Markdown へのエクスポート機能。
