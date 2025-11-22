# 画像フォルダについて

## ローカル画像の配置方法

このフォルダに商品画像を配置してください。

### ファイル命名規則

受注№に基づいて画像を配置します:

```
public/images/
  ├── 61858.jpg      # 基本画像
  ├── 61858A.jpg     # バリエーション A
  ├── 61858B.jpg     # バリエーション B
  ├── 61858C.jpg     # バリエーション C
  └── ...
```

### 対応フォーマット

- .jpg / .jpeg
- .png
- .JPG / .JPEG / .PNG

### GitHub Pagesでの使用

画像をこのフォルダに配置してGitHubにプッシュすると、自動的にGitHub Pagesでも表示されます。

```bash
# 画像を追加
git add public/images/
git commit -m "Add product images"
git push
```

### 注意事項

- GitHubの無料プランでは、リポジトリサイズは1GB未満に制限されています
- 大量の画像がある場合は、Git LFS（Large File Storage）の使用を検討してください
