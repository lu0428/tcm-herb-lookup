# 中藥材查詢庫（自用）

採購中藥材時，手機搜藥材名 → 立刻看到**真偽與偽品、辨識要點、市售等級**，避免買到偽品或差貨。

🔗 網址：https://lu0428.github.io/tcm-herb-lookup/ （部署後生效）

資料來源：個人 Notion「中藥材保存資料庫」的靜態快照（105 味）。純靜態網頁、無後端、離線也能開。

---

## 怎麼用

- **搜尋**：上方輸入框打藥材名、別名/商品名或學名（例：`茯苓`、`雲苓`、`Poria`）。市場俗名也搜得到（`淮山`＝山藥）。
- **展開**：點卡片看完整資料。「🔎 採購辨識」區（真偽/辨識/市售等級/特殊注意）預設展開放大，其餘（法規、保存、藥用）可折疊。
- **篩選**：`可單方販售 / 須複方 / 限茶包型態 / 待查` 快速篩；`⚠️ 僅警示` 只看有毒性/法規警示的品項。
- **深淺主題**：右上 ◐ 切換（跟隨系統 ↔ 手動）。

---

## 換 Logo 與品牌名（朋友做好 logo、公司名定案後）

打開 [`app.js`](app.js)，最上面 `CONFIG` 一段，改這幾個變數即可：

```js
const CONFIG = {
  brandName: "中藥材查詢庫",        // ← 改成正式公司/品牌名
  brandTagline: "採購辨真偽・辨品質",  // ← 副標語
  brandLogo: "🌿",                  // ← 先用 emoji 占位
  brandLogoImg: null,               // ← 有 logo 圖後：設成 "logo.png"，並把圖檔放進本資料夾
  showNotionLink: false,            // 自用可設 true；公開建議維持 false
};
```

- 用圖片 logo：把圖檔（如 `logo.png`）放到 repo 根目錄，`brandLogoImg: "logo.png"`（`brandLogo` 那行留著沒關係，有圖就用圖）。
- 改完存檔 → 執行部署（見下）。

---

## 更新資料（DB 有增修時）

資料在 `data.js`（105 味快照）。要更新時最簡單：**跟路易說一聲**，我會從 Notion 重新匯出、覆蓋 `data.js`，再幫你部署。

> 技術細節（給日後接手）：匯出流程＝撈 Notion 頁面 id → 逐頁 fetch 把 `properties` 原樣存成 `_ref/herbs_json/*.json` → 跑 `python _ref/build_data.py` 合併成 `data.js`。`_ref/` 已 gitignore、不進 repo。

---

## 部署（一鍵）

改了 `data.js`、`app.js`（換 logo）或任何檔案後，在本資料夾用 PowerShell 執行：

```powershell
.\deploy.ps1 "這次改了什麼"
```

它會 `git add / commit / push`，GitHub Pages 約 1 分鐘後更新。

---

## 檔案

| 檔案 | 作用 |
|:--|:--|
| `index.html` | 頁面結構 |
| `style.css` | 視覺（紙感配色、深淺主題、手機 RWD） |
| `app.js` | 邏輯 ＋ 最上方 `CONFIG`（品牌/logo 占位） |
| `data.js` | 105 味資料快照（含匯出日期、品項數） |
| `deploy.ps1` | 一鍵部署 |

---

_自用採購辨識參考，非醫療建議。資料以個人整理為準，實際採購仍請自行核對。_
