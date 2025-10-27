# 緊急避難所マップ

OpenStreetMapを使用した、日本全国の緊急避難所を視覚的に表示するWebアプリケーションです。

## 特徴

- **災害種別ごとのアイコン表示**: 各避難所が対応している災害種別を絵文字アイコンで直感的に表示
- **インタラクティブな地図**: クリック可能なマーカーで詳細情報をポップアップ表示
- **団体コード検索**: 6桁の団体コードを入力して、特定の市町村の避難所を表示
- **レスポンシブデザイン**: スマートフォンやタブレットでも快適に利用可能

## 災害種別アイコン

| アイコン | 災害種別 |
|---------|---------|
| 🌊 | 洪水 |
| ⛰️ | 崖崩れ、土石流及び地滑り |
| 🌀 | 高潮 |
| 🏚️ | 地震 |
| 🌊 | 津波 |
| 🔥 | 大規模な火事 |
| 💧 | 内水氾濫 |
| 🌋 | 火山現象 |

## 使用方法

### ローカルで実行

1. リポジトリをクローン:
```bash
git clone https://github.com/motohasystem/sample-app-shelter-api.git
cd sample-app-shelter-api
```

2. HTMLファイルをブラウザで開く:
```bash
# Pythonを使用する場合
python -m http.server 8000

# Node.jsのhttp-serverを使用する場合
npx http-server
```

3. ブラウザで `http://localhost:8000` にアクセス

### 団体コードの検索

団体コード（6桁）を入力して「データ読み込み」ボタンをクリックします。

**主要都市の団体コード例:**
- 011002: 北海道札幌市
- 131016: 東京都千代田区
- 271004: 大阪府大阪市
- 401005: 福岡県北九州市

団体コードの一覧は[総務省のウェブサイト](https://www.soumu.go.jp/denshijiti/code.html)で確認できます。

## データソース

このアプリケーションは [jp-shelter-api](https://github.com/motohasystem/jp-shelter-api) のデータを使用しています。

- **避難所データ**: 国土地理院の指定避難場所・避難所データ
- **団体コード**: 総務省の「都道府県コード及び市区町村コード」

## 技術スタック

- **地図ライブラリ**: [Leaflet.js](https://leafletjs.com/) - オープンソースのインタラクティブ地図ライブラリ
- **地図タイル**: [OpenStreetMap](https://www.openstreetmap.org/)
- **データAPI**: [jp-shelter-api](https://github.com/motohasystem/jp-shelter-api)
- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript

## ファイル構成

```
sample-app-shelter-api/
├── index.html      # メインHTMLファイル
├── styles.css      # スタイルシート
├── app.js          # アプリケーションロジック
└── README.md       # このファイル
```

## 機能詳細

### 地図表示
- OpenStreetMapのタイルを使用した高品質な地図表示
- ズーム、パン操作に対応

### マーカー表示
- 各避難所の位置にカスタム絵文字アイコンを表示
- 複数の災害種別に対応している場合は、アイコンを組み合わせて表示

### ポップアップ情報
マーカーをクリックすると、以下の情報を表示:
- 施設・場所名
- 住所
- 共通ID
- 対応災害種別（タグ形式）
- 備考（ある場合）

## ライセンス

MIT License

## 謝辞

- [国土地理院](https://www.gsi.go.jp/) - 避難所データの提供
- [jp-shelter-api](https://github.com/motohasystem/jp-shelter-api) - APIの提供
- [Leaflet.js](https://leafletjs.com/) - 地図ライブラリ
- [OpenStreetMap](https://www.openstreetmap.org/) - 地図タイル

## 貢献

プルリクエストや Issue の報告を歓迎します。

## 注意事項

- このアプリケーションは情報提供を目的としています
- 実際の災害時には、自治体の公式情報を必ず確認してください
- データの正確性については、各自治体の最新情報をご確認ください
