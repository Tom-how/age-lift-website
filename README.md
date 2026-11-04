# 艾勁健身工作室官網

純靜態網站，內容都在 `content.json`，由 `admin.html` 後台編輯。不需要主機費。

## 第一次上線（GitHub Pages，免費）

1. 註冊或登入 GitHub，建立一個公開（Public）儲存庫，例如 `age-lift-website`。
2. 把這個 `website` 資料夾「裡面的所有檔案」上傳到儲存庫根目錄（包含 `.nojekyll`）。
3. 到儲存庫的 Settings → Pages，Source 選 `Deploy from a branch`，分支選 `main`、資料夾選 `/ (root)`，按 Save。
4. 約 1～2 分鐘後，網站會出現在 `https://你的帳號.github.io/age-lift-website/`。

## 設定後台

1. 到 GitHub 的 Settings → Developer settings → Personal access tokens → Fine-grained tokens，建立新金鑰。
2. Repository access 只選這個儲存庫，Permissions 的 Contents 選 `Read and write`。
3. 開啟 `https://你的帳號.github.io/age-lift-website/admin.html`，在「發布設定」填入帳號、儲存庫名稱與金鑰，按「測試連線」。

金鑰等於後台密碼：只存在該裝置的瀏覽器，不要在公用電腦使用；遺失裝置時，到 GitHub 撤銷金鑰即可。

## 日常更新

進入 `admin.html` → 修改內容 → 按「預覽」確認 → 按「發布到官網」。官網約 1～2 分鐘後更新。

修改會自動存成這台裝置的草稿，發布前關掉頁面也不會遺失。圖片會自動縮小到長邊 1600px。影片請先上傳到 YouTube，再把連結貼到「工作室介紹」。

## 在電腦上預覽

需要透過本機伺服器開啟（直接點兩下 HTML 檔無法載入內容）。在專案根目錄執行：

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve-website.ps1
```

然後開啟 http://localhost:8791/
