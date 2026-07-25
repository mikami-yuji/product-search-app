# Project Rules & Customizations

## 🚨 Critical Action Rules
1. **推測による事実回答の禁止**: 認証画面や読み取り不可の外部データに対し、推測や当て推量で結果を回答してはならない。確認できない場合は率直に伝え、ブラウザサブエージェント等で実際の DOM/データを確認した上で回答すること。

## 📁 Google Drive Data Specifications
1. **顧客サブフォルダ構成**: `顧客コード_顧客名` （例: `16152_トーベイ（株）`）
2. **画像命名規則**: `受注№（数字5桁）+ アルファベット枝番（A, B, C, a, b...）+ .jpg` （例: `44884A.jpg`）
3. **照合ルール**: 受注№ `44884` から `44884A`, `44884B`, `44884C`, `44884a` 等の枝番を補完生成して最優先ヒットさせること。

## 📱 Mobile Technical Constraints & Patterns
1. **Input Priority**: スマホ環境（`!isFileSystemSupported`）では `<input webkitdirectory>` ではなく `<input type="file" multiple>` (`image-files-input`) を優先トリガーする。
2. **O(1) Search & Non-blocking I/O**: `imageFilesMap` からの探索は O(1) ハッシュ探索とする。IndexedDB へのデータ・キャッシュ保存は `Promise` バックグラウンド非同期（非ブロッキング）処理で行う。
