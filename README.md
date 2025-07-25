# Asmito - AI駆動シフト&給与管理システム

シフト作成や給与計算をAIの力で効率化する次世代管理ツール

## 🚀 概要

**Asmito（アスミト）**は、シフト作成や給与計算を自動化し、管理者と従業員双方の負担を軽減するWebアプリケーションです。

### 主な機能
- 🤖 AI駆動のシフト最適化
- 💰 自動給与計算
- 📊 労働コスト分析
- 📋 法令遵守チェック
- 📱 レスポンシブデザイン

## 🛠 技術スタック

### フロントエンド
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Zustand** (状態管理)

### バックエンド・インフラ
- **Firebase Firestore** (データベース)
- **Firebase Authentication** (認証)
- **Firebase Storage** (ファイルストレージ)
- **Netlify** (ホスティング)
- **Netlify Functions** (サーバーレス)

### AI・最適化
- **OR-Tools** (制約プログラミング)
- **scikit-learn** (機械学習)
- **spaCy** (自然言語処理)

## 📁 プロジェクト構成

```
asmito/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── globals.css      # グローバルスタイル
│   │   ├── layout.tsx       # ルートレイアウト
│   │   ├── page.tsx         # ホームページ
│   │   └── providers.tsx    # プロバイダー設定
│   ├── components/          # 再利用可能コンポーネント
│   ├── lib/                 # ライブラリとユーティリティ
│   │   └── firebase.ts      # Firebase設定
│   ├── store/               # Zustand状態管理
│   │   └── authStore.ts     # 認証状態
│   ├── types/               # TypeScript型定義
│   └── utils/               # ヘルパー関数
├── public/                  # 静的ファイル
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🏁 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env.local` にコピーして、Firebase設定を追加：

```bash
cp .env.example .env.local
```

### 3. Firebase プロジェクトの設定

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクト作成
2. Authentication、Firestore、Storage を有効化
3. 設定情報を `.env.local` に追加

### 4. 開発サーバー起動

```bash
npm run dev
```

## 🚀 デプロイメント

### Netlify へのデプロイ

1. GitHub リポジトリにプッシュ
2. Netlify でリポジトリを接続
3. 環境変数を設定
4. 自動デプロイ開始

### ビルドコマンド
```bash
npm run build
```

## 📝 開発ガイド

### 型チェック
```bash
npm run type-check
```

### リンター実行
```bash
npm run lint
```

### テスト実行
```bash
npm test
```

## 🌟 主要機能（予定）

### Phase 1 (MVP - 2ヶ月)
- [x] 基本プロジェクト設定
- [ ] ユーザー認証
- [ ] 基本シフト作成
- [ ] 簡易給与計算

### Phase 2 (AI機能 - 4ヶ月)
- [ ] AI最適化エンジン
- [ ] 制約条件対応
- [ ] レポート機能

### Phase 3 (統合・拡張 - 6ヶ月)
- [ ] 外部サービス連携
- [ ] PWA対応
- [ ] エンタープライズ機能

## 🤝 コントリビューション

1. フォークする
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 📞 サポート

質問やサポートが必要な場合は、[Issues](https://github.com/nohataku/asmito/issues) を作成してください。

---

*作成者: Nohataku*  
*最終更新: 2025年7月26日*
