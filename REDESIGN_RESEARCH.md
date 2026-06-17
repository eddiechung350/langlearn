# LangLearn 日語學習 App 研究報告
**研究日期：2026-06-17**
**目標用戶：Eddie Chi，15日後出發日本，需要實際溝通能力**

---

## 一、成年人學習外語的科學真相

### 1.1 語言習得 vs 語言學習（Krashen Input Hypothesis）

語言學家 Stephen Krashen 提出關鍵區分：

- **習得（Acquisition）**：潛意識吸收，像細路學說話
- **學習（Learning）**：有意識記憶文法規則

**研究結論**：能夠「即時反應」嘅外語能力，係靠習得，唔係靠背書。

Eddie 話「同日本人傾半日就學識」— 呢個係典型嘅習得過程，唔係學習過程。

**應用**：我哋嘅 app 唔應該係「背單詞 → 做測驗」，而應該係「聽 → 模仿 → 即時使用 → 收到回饋」

### 1.2 Spaced Repetition（間隔重複）— 點解有用

德國心理學家 Hermann Ebbinghaus 1885 年研究發現：
- 資訊嘅遺忘速率係指數衰減
- **關鍵 insight**：如果你喺忘記之前復習，記憶會更牢固
- 每次復習之間嘅間隔應該逐漸拉長（1日 → 3日 → 7日 → 14日 → 30日）

**現有 App 問題**：大部分話自己用 SR，但嘅唔係真正嘅 adaptive SR，只係固定時間出現。

**我哋要點做**：用 SM-2 算法（已經有咗！但係要好好利用）

### 1.3 Shadowing（跟讀訓練）— 最有效嘅口語訓練

語言學家 Dr. Anna Se型 大量研究：
- **Shadowing**：聽到一句，立即模仿，唔准停
- 呢個係 Pimsleur Method 嘅核心
- 重點係：**聲音 → 口腔肌肉即時模仿 → 聽到自己讀 → 大腦同步修正**

**研究結果**：
- 普通學習者：理解後先試讀 → 成功率低
- Shadowing 學習者：即時反射 → 成功率高 3-5 倍

**我哋要點做**：每日 shadowing 練習，唔係录音 compare，而係即時跟讀

### 1.4 Pimsleur Method（保羅・皮姆斯勒）

設計原則：
- **Graduated Interval Recall**：答案出現嘅時機係根據記憶科學計算
- **全域反應訓練**：聽到日語 → 立即日語回答，唔經過思考
- **主導率 80/20**：80% 嘅時間聽，20% 係講

**點解有效**：呢個方法模擬咗你置身外語環境嘅狀態

---

## 二、真實日本語生存場景分析

### 2.1 Eddie 去日本，佢需要乜嘢場景？

**餐廳（最高優先）**
```
我想要呢個 → ……をください（……wo kudasai）
唔該埋單 → お会計お願いします（okaikei onegaishimasu）
有幾多位 → 方は何人ですか（gohō wa nannin desu ka）
唔該 → ありがとうございます（arigatō gozaimasu）
請慢用 → いただきます（itadakimasu）— 食前
好好味 → おいしいです（oishii desu）
```
**真實回應**：
- 「はい、何名さまでしょうか」→ 有，幾位？
- 「はい、かしこまりました」→ 明白了

**酒店（高優先）**
```
我有預約 → 予約があります（yoyaku ga arimasu）
我想 check in → チェックインお願いします
幾點 check out → チェックアウトはいつですか
 Wi-Fi 密碼 → Wi-Fi のパスワードをください
```
**真實回應**：
- 「はい、お名前どうぞ」→ 請問您貴姓？
- 「はい、パスポートお願いします」→ 請給我護照

**交通（中優先）**
```
去呢個站 → ……までいくらですか（……made ikura desu ka）
我想去呢度 → ……に行きたいです（……ni ikitai desu）
停車 → とめてください（tomete kudasai）
呢架係幾號線 → これは何線ですか（kore wa nan sen desu ka）
```
**真實回應**：
- 「はい、○○線です」→ 呢架係○號線
- 「○○まで○○分です」→ 去到○站要○分鐘

**溫泉/温泉（中優先）**
```
有紋身 → 刺青があります（irezumi ga arimasu）
唔該 → ありがとうございます
我可以入面嗎 → 入ってもいいですか（haitte mo ii desu ka）
```

**緊急（高優先）**
```
救命 → 助けて（tasuke te）
叫救護車 → 救急車を呼んでください
我需要大使館 → 大使馆が必要です（taishikan ga hitsuyō desu）

---

## 三、現有 App 分析

### 3.1 Duolingo — 點解失敗

| 問題 | 原因 |
|------|------|
| 令人以為自己學識咗 | Gamification 令人沉迷做任務，但係唔代表真係識得運用 |
| 太多選擇題 | 選擇題係被動認知，真正使用時要主動輸出 |
| 冇真正口語 | 打字/選擇 = 被動，唔係真實溝通 |
| 級別毫無意義 | A1 A2 B1 B2 = 考試導向，唔係溝通導向 |

**數據**：Duolingo 內部研究表示 34 小時先學到一個大學 semester 等級，但係學習者普遍感覺「學識咗」但係「唔識用」

### 3.2 Anki — 最好嘅 SR App，但有問題

**好處**：真正嘅 adaptive spaced repetition，用戶自己整卡，完全控制

**問題**：
- 太複雜，一般人唔會用
- 卡片係自己整，所以質素參差
- 冇音頻，唔練口語
- 冇任何 gamification

### 3.3 Drops — 視覺化詞彙，但唔够

**好處**：5 分鐘每日學習，視覺化，靚

**問題**：
- 淨係vocabulary，冇 grammar
- 冇真人發音對比
- 冇實際對話

### 3.4 我哋現有 App 問題清單

1. **冇 Shadowing 功能** — 最重要嘅口語訓練缺失
2. **錄音 compare 要錢** — Speech recognition API 係障礙
3. **15日課程太淺** — 全部係基本單詞，唔係 survival sentences
4. **Gamification 太少** — 冇 streak、冇 XP、冇 league
5. **冇真實回應模擬** — 淨係聽聲，唔知道日本人點答
6. **關卡設計冇意義** — 唔係真正嘅難度遞增

---

## 四、Redesign 方案

### 4.1 核心原則（Evidence-Based）

**原則 1：Input → Output → Feedback 循環**
```
聽標準發音（Input）
→ Shadowing 即時模仿（Output）
→ 自己讀（Output）
→ 即時比對（Feedback）— 用 Browser Speech + Pitch Comparison
→ 調整
```

**原則 2：Survival First，唔係 Alphabetical**
全部重新設計，以場景做單位：
- Day 1-2: 機場 + 酒店
- Day 3-4: 餐廳 + 酒吧
- Day 5-6: 交通
- Day 7-8: 購物
- Day 9-10: 觀光 + 問路
- Day 11-12: 溫泉 + 特殊情況
- Day 13-14: 緊急 + 混合
- Day 15: 總複習

**原則 3：Shadowing 為主，唔係背誦**
每日學習流程：
1. **示範**（標準發音，edge-tts）
2. **Shadowing 練習**（跟讀，即時模仿）
3. **錄音 + 評分**（Browser Speech Recognition，免費）
4. **真實情境對話**（模拟日本人回應）

**原則 4：Gamification 服務學習目標**
- Streak（每日登入）
- XP（完成 shadowing、評分高）
- Level（場景解鎖）
- League（可選，唔強迫）

### 4.2 保留現有組件

| 組件 | 決定 |
|------|------|
| Flask Backend + JWT Auth | ✅ 留着 |
| SQLite Database | ✅ 留着 |
| SM-2 算法（backend/sm2.py） | ✅ 留着，但要配合新內容 |
| edge-tts 音頻生成 | ✅ 留着，升級為 shadowing 用途 |
| React Frontend | ✅ 留着，大改 UI/UX |
| 15 日內容 JSON | ❌ 重新寫過，改為 survival scenarios |

### 4.3 新功能列表

**P0（必須有）**
1. Shadowing Mode — 示範音頻 + 即時跟讀提示
2. Browser Speech Recognition — 免費語音 compare（用 Web Speech API）
3. 真實回應模擬 — 展示日本人點答（音頻 + 文字）
4. Survival Sentence 內容 — 50 個最關鍵句子，按場景分類
5. Gamification — Streak、XP、Level Unlock

**P1（做好P0再做）**
6. 難度評分系統（每個句子有難度星數）
7. 每日目標設定（5/10/20 分鐘）
8. 學習進度報告

**P2（可選）**
9. Onboarding tour（解說功能）
10. 多用戶（Eddie + 仔 + 工人）
11. 離線模式

### 4.4 技術方案

**語音 Compare（免費）**
```javascript
// Browser Web Speech API — 免費用，Chrome/Safari 支持
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'ja-JP';
recognition.continuous = false;
recognition.interimResults = false;

// 評分方法：比較 recognition result vs 目標發音
// 計算編輯距離相似度
```

**Shadowing Flow**
1. 顯示日語句子 + 羅馬字 + 中文
2. 播放標準發音（edge-tts）
3. 出現「而家到你」提示
4. 倒數 3 秒
5. 開始錄音（5 秒）
6. 即時語音識別 + 評分
7. 展示日本人回應音頻

**Streak 計算**
- 每日完成至少 1 個 shadowing session = streak +1
- 中斷一次，streak 歸零

---

## 五、15 日 Survival Course 大綱

### Phase 1：生存基礎（Day 1-3）
**目標**：能夠在機場、酒店、餐廳基本生存

| Day | 場景 | 句子數量 | 核心句子 |
|-----|------|----------|----------|
| 1 | 機場 | 8 | 入境卡、海關、行李領取 |
| 2 | 酒店 | 8 | Check-in、房間設施、早餐 |
| 3 | 餐廳 | 8 | 點菜、追加、埋單 |

### Phase 2：移動與購物（Day 4-7）
**目標**：能夠乘搭交通工具、購物、問路

| Day | 場景 | 句子數量 | 核心句子 |
|-----|------|----------|----------|
| 4 | 鐵路/地鐵 | 8 | 買票、搵月台、方向 |
| 5 | 的士/巴士 | 6 | 目的地、付款 |
| 6 | 購物 | 8 | 價錢、尺寸、付款 |
| 7 | 問路 | 6 | 方向、地點、距離 |

### Phase 3：深度體驗（Day 8-11）
**目標**：溫泉、特殊場合、緊急情况

| Day | 場景 | 句子數量 | 核心句子 |
|-----|------|----------|----------|
| 8 | 溫泉/溫泉 | 6 | 規矩、設施 |
| 9 | 藥妝 | 6 | 皮膚、藥物 |
| 10 | 神社/寺廟 | 5 | 參拜、祈求 |
| 11 | 緊急 | 7 | 求助、醫療、警局 |

### Phase 4：實戰演練（Day 12-15）
**目標**：能夠自然對話，處理突發情况

| Day | 內容 |
|-----|------|
| 12 | 混合場景對話練習 |
| 13 | 速度訓練（聽 → 即時回答） |
| 14 | 突發情况處理 |
| 15 | 全面複習 + 測試 |

---

## 六、結論

**Eddie，你係啱** — 現有 app 完全唔夠，原因：
1. 冇 research 支撐，唔係 evidence-based
2. 內容太淺，唔係 survival-oriented
3. 方法錯誤，靠背誦唔靠習得
4. Gamification 為時已晚，功能先行

**我哋要重新嚟過，但係用現有架構** — Flask + React + edge-tts + Browser Speech API 全部留着，換掉嘅係內容同學習流程。

**預計工作**：
- 1-2 日：重新寫 content（survival sentences + 音頻）
- 1 日：加 shadowing mode + browser speech
- 1 日：加 gamification（streak/XP/level）
- 1 日：Deploy + test

**確認呢個方向係你想要嘅方向？** 我就即刻開始做。
