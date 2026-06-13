# 中國信託HR AI講座Copilot大補貼

這是一個 GitHub Pages 靜態網站，作為中國信託 HR AI 講座的課後補充禮物。首頁先呈現人資工作需求地圖，再提供可直接試用的 Copilot Agent 與 Prompt 工具庫。

## 內容範圍

- 人資工作需求彙整，不公開原始需求資料 PDF。
- 繁中 v2 Copilot 工具內容完整匯入，前台不顯示原始來源代碼。
- 全站 UI 不使用表情符號圖示。
- 視覺色彩依提供色票：
  - CTBC Teal Green：`#007A76`
  - CTBC Red：`#EC1F28`
  - Bracket Green：`#15A850`

## 本地預覽

```bash
npm run check
npm run serve
```

開啟 `http://localhost:8080/`。

## GitHub Pages 發佈

1. 建立 GitHub repo。
2. 將本資料夾內容推到 `main` 分支。
3. 到 repo 的 Settings → Pages，來源選擇 GitHub Actions。
4. 等待 `Deploy GitHub Pages` workflow 完成。
5. 對外分享網址：`https://bj981213.github.io/ctbc-hr-ai-copilot-boost/`。

## 預計公開連結

若 GitHub repo 名稱使用本專案預設的 `ctbc-hr-ai-copilot-boost`，中國信託 HR 可以直接使用這個連結：

```text
https://bj981213.github.io/ctbc-hr-ai-copilot-boost/
```

若 repo 名稱不同，連結格式會改為：

```text
https://bj981213.github.io/<repo-name>/
```

## 使用提醒

這份網站是課後補充工具箱，不是中國信託正式內部系統。請勿在公開頁面輸入或上傳個資、薪酬、績效、內部制度或未公開業務資料。若需要處理敏感資訊，請依公司資訊安全與資料分級規範使用核准工具。

內容經授權整理自 [Copilot-in-1mins](https://andyhung11.github.io/Copilot-in-1mins/) 與 [AndyHung11/Copilot-in-1mins](https://github.com/AndyHung11/Copilot-in-1mins)，並依中國信託 HR AI 講座需求重新編排。
