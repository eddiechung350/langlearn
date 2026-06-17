# LangLearn 日語學習 App — 完整規格說明書
**版本：v2.0 (Redesign)**
**制定日期：2026-06-17**
**目標用戶：Eddie Chi，15日後出發日本，需要實際溝通能力**

---

## 一、產品願景

**一句話**：15日內將Eddie從零基礎訓練到可以在日本實際生存對話。

**核心理念**：
- 不是背單詞，是練反射
- 不是考試，是Shadowing
- 不是App，是教練

**用戶旅程**：
1. 打開App → 看到今日目標
2. 選擇場景 → 進入Shadowing練習
3. 聽 → 跟讀 → 即時評分
4. 解鎖下一關 → XP + Streak
5. 15日後 → 可以同日本人基本溝通

---

## 二、學習系統設計

### 2.1 Shadowing 核心流程

每個句子的學習順序：

```
[1] 示範聲音
    ↓
[2] 顯示句子（日語 + 羅馬字 + 中文）
    ↓
[3] 出現提示：「而家到你」
    ↓
[4] 倒數 3 秒（比併開始）
    ↓
[5] 錄音（5 秒內讀完）
    ↓
[6] Browser Speech Recognition 轉換為文字
    ↓
[7] 評分（相似度 %）
    ↓
[8a] ≥70% → ✅ 通過，顯示「太好了！」
    ↓
[8b] <70% → 再試一次（最多3次）
    ↓
[9] 顯示日本人回應（音頻 + 文字）
    ↓
[10] 完成，XP +1
```

### 2.2 評分算法

```javascript
// 評分方法：計算日語拼音相似度
// 目標：發音相似度 ≥ 70% 為通過

function calculateScore(target, spoken) {
  // 移除所有非日語字符，轉為羅馬字
  // 比較編輯距離（Levenshtein Distance）
  // 返回相似度百分比
  
  // 備用方案：如果 Browser Speech 識別出日語有誤差
  // 用「關鍵音節匹配」— 檢查重要音節是否存在
}
```

### 2.3 SM-2 間隔重複（用於複習）

每個句子有5個難度等級（0-4）：
- **0**：完全不記得
- **1**：有印象但讀不出
- **2**：能讀但發音差
- **3**：基本正確
- **4**：完全掌握

下一次復習間隔：
- Rating 0 → 1日後
- Rating 1 → 3日後
- Rating 2 → 7日後
- Rating 3 → 14日後
- Rating 4 → 30日後

**復習觸發條件**：
- 當日學習完成後，系統計算今日新句子中哪些需要复习
- 或者用户進入「復習模式」查看所有待復習句子

---

## 三、內容系統

### 3.1 句子結構

```json
{
  "id": "d01s01",
  "day": 1,
  "scene": "機場入境",
  "difficulty": 1,
  "type": "survival",
  "japanese": "すみません、パスポートをください",
  "romaji": "Sumimasen, pasupōto wo kudasai",
  "chinese": "請給我護照",
  "pronunciation": "su-mi-ma-sen, pa-su-pō-to wo ku-da-sai",
  "audio_file": "d01s01.mp3",
  "native_response": {
    "japanese": "はい、どうぞ",
    "romaji": "Hai, dōzo",
    "chinese": "好的，請",
    "audio_file": "d01s01_response.mp3"
  },
  "keywords": ["すみません", "パスポート", "ください"],
  "grammar_note": "を = 直接對象助詞"
}
```

### 3.2 15日 Survival Course

**Phase 1：生存基礎（Day 1-3）**
- Day 1：機場（入境、海關、行李）
- Day 2：酒店（Check-in、設施、早餐）
- Day 3：餐廳（點菜、埋單、追加）

**Phase 2：移動與購物（Day 4-7）**
- Day 4：鐵路/地鐵
- Day 5：的士/巴士
- Day 6：購物/藥妝
- Day 7：問路/方向

**Phase 3：深度體驗（Day 8-11）**
- Day 8：溫泉/溫泉規矩
- Day 9：便利店/自動售賣機
- Day 10：神社/寺廟
- Day 11：緊急情况（醫療、求助）

**Phase 4：實戰演練（Day 12-15）**
- Day 12：混合場景對話
- Day 13：速度訓練（限時回答）
- Day 14：突發情况處理
- Day 15：全面測試 + 結業

**每日句子數量**：6-8個（視乎難度）
**總句子數量**：~100個（核心 survival sentences）

### 3.3 場景分類

```javascript
const SCENES = {
  AIRPORT: { name: "✈️ 機場", icon: "✈️", color: "#87CEEB" },
  HOTEL: { name: "🏨 酒店", icon: "🏨", color: "#DDA0DD" },
  RESTAURANT: { name: "🍜 餐廳", icon: "🍜", color: "#FFB6C1" },
  TRANSPORT: { name: "🚇 交通", icon: "🚇", color: "#98FB98" },
  SHOPPING: { name: "🛍️ 購物", icon: "🛍️", color: "#FFDAB9" },
  ONSEN: { name: "♨️ 溫泉", icon: "♨️", color: "#B0C4DE" },
  EMERGENCY: { name: "🚨 緊急", icon: "🚨", color: "#FF6B6B" },
  MIXED: { name: "🎯 混合", icon: "🎯", color: "#D3D3D3" }
};
```

---

## 四、遊戲化系統

### 4.1 等級（Level）系統

用戶有等级，反映佢嘅學習程度：

| 等級 | 名稱 | 要求 | 解鎖 |
|------|------|------|------|
| Lv1 | 初心 | 0 XP | ✅ |
| Lv2 | 見習 | 50 XP | 通過10個句子 |
| Lv3 | 入門 | 150 XP | 完成Day 1-2 |
| Lv4 | 旅客 | 300 XP | 完成Day 3-5 |
| Lv5 | 遊人 | 500 XP | 完成Day 6-8 |
| Lv6 | 熟手 | 800 XP | 完成Day 9-11 |
| Lv7 | 達人 | 1200 XP | 完成Day 12-15 |
| Lv8 | 精通 | 1800 XP | 全部句子通過3次 |

### 4.2 XP（經驗值）系統

每個動作獲得 XP：

| 動作 | XP |
|------|-----|
| 完成一個句子Shadowing | +10 XP |
| 一次通過（無需重試） | +5 XP 獎勵 |
| 完成當日全課程 | +20 XP 獎勵 |
| 連續3日登入 | +10 XP |
| 複習並正確 | +5 XP |
| 速度挑戰（<3秒回答） | +15 XP |

### 4.3 Streak（連續登入）系統

- 每日完成至少1個句子 = Streak +1
- 中斷1日 = Streak 歸零
- Streak 影響 XP 倍率：
  - 1-2日：1x
  - 3-6日：1.5x
  - 7-13日：2x
  - 14+日：3x

### 4.4 每日目標

用戶可以設定每日目標：

| 難度 | 每日句子數 | 預計時間 |
|------|------------|----------|
| 輕量 | 3句 | ~10分鐘 |
| 標準 | 6句 | ~20分鐘 |
| 強化 | 10句 | ~30分鐘 |
| 極限 | 15句 | ~45分鐘 |

### 4.5 成就徽章（Achievements）

| 徽章 | 條件 |
|------|------|
| 🏁 初學者 | 完成第一個句子 |
| 📅 一週戰士 | 連續7日登入 |
| 🔥 烈火 | 連續14日登入 |
| 🎯 首次通關 | 完成第一日 |
| ⭐ 全部掌握 | 某句子獲得Rating 4 |
| 🚀 加速王 | 速度挑戰獲得100% |
| 🗾 旅行預備 | 完成Day 1-5 |
| 🏯 達人之路 | 完成全部15日 |

---

## 五、頁面結構與流程

### 5.1 頁面列表

1. **Splash Screen** — Logo + 加載動畫（1秒）
2. **Onboarding（首次使用）** — 3頁滑動介紹功能
3. **Home（主頁）** — 今日目標、Streak、XP、選擇場景
4. **Lesson（課程頁）** — 當日句子列表 + 進度
5. **Shadowing（練習頁）** — 核心Shadowing流程
6. **Result（結果頁）** — 評分、XP、下一個
7. **Review（復習頁）** — 所有待復習句子
8. **Stats（統計頁）** — 學習進度、圖表
9. **Settings（設定頁）** — 每日目標、通知設定

### 5.2 各頁面詳細規格

#### 5.2.1 Splash Screen
```
[動畫：日語單詞飄入動畫，1秒過渡]
↓
[檢查登入狀態]
  ├─ 已登入 → Home
  └─ 未登入 → Onboarding 或 Login
```

#### 5.2.2 Onboarding（首次使用，3頁）

**第1頁**：
- 標題：「15日日本語」
- 副文字：「為你的日本之旅做好準備」
- 插圖：日本地圖 + 飛機

**第2頁**：
- 標題：「Shadowing 學習法」
- 副文字：「聽 → 跟讀 → 即時反饋，練出反射」
- 插圖：耳朵 + 嘴巴 icon

**第3頁**：
- 標題：「每日10分鐘」
- 副文字：「設定目標，追蹤進度」
- 按鈕：「開始學習」→ Login/Register

#### 5.2.3 Home（主頁）

```
┌─────────────────────────────┐
│  [👤 Eddie]        [⚙️]    │  Header
├─────────────────────────────┤
│  🔥 Streak: 5日    ⭐ Lv3  │  狀態列
├─────────────────────────────┤
│  📊 今日目標：3/6 句子     │  進度 Bar
│  ████████░░░░░░░░░░░  50%  │
├─────────────────────────────┤
│  🎯 今日推薦                │
│  ┌─────────────────────────┐│
│  │ ✈️  機場入境             ││  今日場景 Card
│  │     6個句子  ~10分鐘     ││
│  │     [繼續學習 →]         ││
│  └─────────────────────────┘│
├─────────────────────────────┤
│  📚 選擇場景                │
│  [✈️] [🏨] [🍜] [🚇]       │  場景捷徑
│  [🛍️] [♨️] [🚨] [🎯]      │
├─────────────────────────────┤
│  📈 學習統計       [睇曬 →] │
│  已學：42句子  待復習：8   │
└─────────────────────────────┘
```

**邏輯**：
- 如果 Streak > 0，顯示「🔥 Streak: X日」
- 如果今日已完成目標，顯示「✅ 今日完成！」
- 每日00:00自動刷新

#### 5.2.4 Lesson（課程頁）

```
┌─────────────────────────────┐
│  [←] Day 3：餐廳           │
├─────────────────────────────┤
│  📊 進度：4/8 句子         │
│  ██████████░░░░░░  50%    │
├─────────────────────────────┤
│  ┌─────────────────────────┐│
│  │ ✅ d3s01 すみません...  ││  句子列表
│  │ ✅ d3s02 コーヒーを...   ││  (完成✓ / 鎖定🔒)
│  │ 🔒 d3s03 ...            ││
│  │ 🔒 d3s04 ...            ││
│  └─────────────────────────┘│
├─────────────────────────────┤
│  [🎯 開始學習]              │  主要按鈕
└─────────────────────────────┘
```

**邏輯**：
- 句子按順序解鎖（必須完成上一個先解鎖下一個）
- 已完成句子顯示 ✅ + 評分（星數）
- 鎖定句子顯示 🔒
- 「開始學習」從第一個未完成句子開始

#### 5.2.5 Shadowing（練習頁）— 核心頁面

```
┌─────────────────────────────┐
│  [×]  1/8         ⏱️ 10分鐘 │
├─────────────────────────────┤
│                             │
│     📢 す み ま せ ん       │  日語大字
│        (Su-mi-ma-sen)       │  羅馬字
│                             │
│     請給我護照               │  中文
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │     🔊 播放標準發音    │  │  音頻播放區
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │   🎤                   │  │
│  │                       │  │  錄音區
│  │   [ 開始跟讀 ]         │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
├─────────────────────────────┤
│  💡 提示：すみません = 借过/麻烦 │  語法提示
└─────────────────────────────┘
```

**Shadowing 流程狀態**：

**狀態 A：等待開始**
```
[ 🔊 播放標準發音 ] ← 可點擊
[ 🎤 開始跟讀 ]    ← 可點擊
```

**狀態 B：倒數**
```
        3... 2... 1... 0!
        [🔴 錄音中...]
```

**狀態 C：評分中**
```
    [⏳ 評分中...]
```

**狀態 D：結果（通過）**
```
    ┌─────────────────────┐
    │    🎉 太好了！        │
    │    評分：85%         │
    │    [⭐⭐⭐]          │
    │    XP +15           │
    └─────────────────────┘
    
    日本人這樣說：
    ┌─────────────────────┐
    │  はい、どうぞ        │
    │  (Hai, dōzo)        │
    │  好的，請            │
    │  [🔊 聽]            │
    └─────────────────────┘
    
    [下一句 →]
```

**狀態 D2：結果（未通過，嘗試機會）**
```
    ┌─────────────────────┐
    │    加油！再試一次    │
    │    評分：45%         │
    │    剩餘：2次        │
    └─────────────────────┘
    
    [🔄 再試一次]
```

**狀態 D3：結果（3次都未通過）**
```
    ┌─────────────────────┐
    │    明白了！          │
    │    稍後再練習        │
    │    (記住先繼續)     │
    └─────────────────────┘
    
    [繼續下一句 →]
```

#### 5.2.6 Review（復習頁）

```
┌─────────────────────────────┐
│  [←] 復習                   │
├─────────────────────────────┤
│  📚 待復習：8個句子         │
├─────────────────────────────┤
│  ┌─────────────────────────┐│
│  │ 🔔 d01s03 すみません... ││  按到期日排序
│  │    到期：今日           ││
│  │    [開始復習]           ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ 🔔 d02s01 予約が...     ││
│  │    到期：明日           ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

**復習流程**：同 Shadowing 一樣，但係舊句子，唔獲得 XP（或者 XP 減半）

#### 5.2.7 Stats（統計頁）

```
┌─────────────────────────────┐
│  [←] 學習統計               │
├─────────────────────────────┤
│  📅 學習日數：7日           │
│  📝 總句子：42/100         │
│  🔄 復習完成：35次         │
├─────────────────────────────┤
│  📈 進度圖                  │
│  [bar chart — 7日學習趨勢] │
├─────────────────────────────┤
│  🏆 成就                    │
│  [🏁] [📅] [🔥] [🎯]       │
├─────────────────────────────┤
│  ⭐ 最近獲得：              │
│  +20 XP 完成Day 3          │
│  2小時前                    │
└─────────────────────────────┘
```

#### 5.2.8 Settings（設定頁）

```
┌─────────────────────────────┐
│  [←] 設定                   │
├─────────────────────────────┤
│  🎯 每日目標                │
│  ○ 輕量（3句）              │
│  ● 標準（6句）← 預設       │
│  ○ 強化（10句）             │
│  ○ 極限（15句）             │
├─────────────────────────────┤
│  🔔 提醒                    │
│  [開] 每日提醒時間          │
│       [09:00 ▼]            │
├─────────────────────────────┤
│  👤 帳戶                    │
│  用戶名：Eddie              │
│  等級：Lv3                  │
│  [登出]                     │
├─────────────────────────────┤
│  📱 其他                    │
│  版本：v2.0                │
│  [關於] [幫助]              │
└─────────────────────────────┘
```

---

## 六、登入/注冊流程

### 6.1 Register（注冊）

```
┌─────────────────────────────┐
│  LangLearn                 │
│  15日日本語大冒險           │
├─────────────────────────────┤
│  [👤 用戶名]               │
│  [🔒 密碼]                 │
│  [🔒 確認密碼]             │
├─────────────────────────────┤
│  [     注冊     ]          │
├─────────────────────────────┤
│  已有帳戶？[登入]           │
└─────────────────────────────┘
```

**驗證規則**：
- 用戶名：3-20字，唔准特殊字符
- 密碼：最少6字

**錯誤情況**：
- 用戶名已存在 → 「呢個名被人用咗」
- 密碼太短 → 「密碼起碼6個字」
- 確認密碼唔同 → 「兩次密碼唔同」

### 6.2 Login（登入）

```
┌─────────────────────────────┐
│  LangLearn                 │
├─────────────────────────────┤
│  [👤 用戶名]               │
│  [🔒 密碼]                 │
├─────────────────────────────┤
│  [     登入     ]          │
├─────────────────────────────┤
│  未有帳戶？[注冊]          │
└─────────────────────────────┘
```

**錯誤情況**：
- 用戶名/密碼錯誤 → 「用戶名或密碼錯誤」
- 網絡錯誤 → 「網絡問題，請重試」

---

## 七、數據模型

### 7.1 數據庫（SQLite）

```sql
-- 用戶表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_login_date TEXT,
  daily_goal TEXT DEFAULT 'standard',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 句子表（靜態內容）
CREATE TABLE phrases (
  id TEXT PRIMARY KEY,       -- 'd01s01'
  day INTEGER NOT NULL,     -- 1-15
  scene TEXT NOT NULL,       -- 'airport'
  difficulty INTEGER NOT NULL, -- 1-5
  japanese TEXT NOT NULL,
  romaji TEXT NOT NULL,
  chinese TEXT NOT NULL,
  audio_file TEXT,           -- 'd01s01.mp3'
  keywords TEXT,             -- JSON array
  grammar_note TEXT,
  PRIMARY KEY (id)
);

-- 用戶進度表
CREATE TABLE user_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  phrase_id TEXT NOT NULL,
  rating INTEGER DEFAULT 0,   -- 0-4 (SM-2)
  ease_factor REAL DEFAULT 2.5,
  interval INTEGER DEFAULT 1, -- 天數
  next_review_date TEXT,
  last_reviewed TEXT,
  times_reviewed INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0, -- 最高評分%
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (phrase_id) REFERENCES phrases(id),
  UNIQUE(user_id, phrase_id)
);

-- 用戶成就表
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id TEXT NOT NULL,
  earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, achievement_id)
);

-- 每日統計表
CREATE TABLE daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  sentences_completed INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  streak_earned BOOLEAN DEFAULT FALSE,
  time_spent_minutes INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);
```

### 7.2 API Endpoints

```
認證：
POST   /api/auth/register     — 注冊
POST   /api/auth/login        — 登入
GET    /api/auth/me           — 獲取當前用戶

用戶：
GET    /api/user              — 獲取用戶資料（含XP、Level、Streak）
PUT    /api/user/goal         — 更新每日目標
POST   /api/user/streak       — 更新Streak（每日調用）

課程：
GET    /api/lessons           — 獲取所有Day列表
GET    /api/lessons/:day      — 獲取某日所有句子
GET    /api/phrases/:id       — 獲取某句子詳情

學習：
POST   /api/learn/complete    — 完成一個句子（評分、計算下次復習）
GET    /api/learn/review      — 獲取待復習句子列表
POST   /api/learn/review-complete — 完成復習

統計：
GET    /api/stats             — 用戶統計（總句子、總XP、等級）
GET    /api/stats/daily       — 每日統計
GET    /api/stats/achievements — 成就列表

音頻：
POST   /api/tts               — 生成TTS音頻（edge-tts）

成就：
GET    /api/achievements      — 所有成就列表
GET    /api/achievements/user — 用戶已獲得成就
```

---

## 八、技術實現

### 8.1 前端（React）

**主要組件**：
```
src/
├── App.jsx                   — 主應用、路由
├── api.js                    — API 客戶端
├── pages/
│   ├── Home.jsx              — 主頁
│   ├── Login.jsx             — 登入
│   ├── Register.jsx          — 注冊
│   ├── Lesson.jsx            — 課程頁（句子列表）
│   ├── Shadowing.jsx         — 核心練習頁（狀態機）
│   ├── Review.jsx            — 復習頁
│   ├── Stats.jsx             — 統計頁
│   ├── Settings.jsx          — 設定頁
│   └── Onboarding.jsx        — 首次使用介紹
├── components/
│   ├── Header.jsx            — 頂部導航
│   ├── ProgressBar.jsx       — 進度條
│   ├── SentenceCard.jsx      — 句子卡片
│   ├── AudioPlayer.jsx       — 音頻播放器
│   ├── RecordButton.jsx      — 錄音按鈕
│   ├── ScoreDisplay.jsx      — 評分顯示
│   ├── StreakBadge.jsx       — Streak顯示
│   └── AchievementBadge.jsx  — 成就徽章
├── hooks/
│   ├── useShadowing.js       — Shadowing狀態管理
│   ├── useSpeechRecognition.js — Browser語音識別
│   ├── useAudio.js          — 音頻播放/錄製
│   └── useXP.js             — XP動畫
└── context/
    ├── AuthContext.jsx       — 認證狀態
    └── ProgressContext.jsx   — 學習進度
```

### 8.2 後端（Flask）

**目錄結構**：
```
backend/
├── app.py                    — Flask應用工廠
├── requirements.txt
├── models.py                 — SQLAlchemy模型
├── sm2.py                    — SM-2算法
├── auth.py                   — JWT工具
├── content/
│   └── sentences_v2.json     — 新版100個survival句子
├── routes/
│   ├── __init__.py
│   ├── auth_routes.py
│   ├── user_routes.py
│   ├── lesson_routes.py
│   ├── learn_routes.py
│   └── stats_routes.py
├── generate_audio.py         — edge-tts音頻生成
└── static/audio/            — TTS音頻文件
```

### 8.3 語音識別（Browser Web Speech API）

```javascript
// 完全免費，唔需要任何API Key
// Chrome、Edge、Safari都支持

const recognition = new (window.SpeechRecognition || 
                        window.webkitSpeechRecognition)();
recognition.lang = 'ja-JP';
recognition.continuous = false;
recognition.interimResults = false;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  const score = calculateScore(targetJapanese, transcript);
  showResult(score);
};

recognition.onerror = (event) => {
  if (event.error === 'not-allowed') {
    showError('請允許使用麥克風');
  } else if (event.error === 'no-speech') {
    showError('未能識別到語音');
  }
};

// 開始錄音
recognition.start();
```

### 8.4 評分算法（前端實現）

```javascript
// 計算日語發音相似度
function calculateScore(target, spoken) {
  // 1. 清理文字
  const cleanTarget = target.replace(/[^\u3040-\u309F\u30A0-\u30FF]/g, '');
  const cleanSpoken = spoken.replace(/[^\u3040-\u309F\u30A0-\u30FF]/g, '');
  
  // 2. 如果Browser Speech無法識別日語（經常發生）
  // 嘗試使用 romaji 比較
  if (!cleanSpoken) {
    // Fallback：檢查是否起碼有聲音被識別
    if (spoken && spoken.length > 0) {
      // 起碼有輸入，但日語識別失敗
      // 給予部分分數
      return 50; // 保守估計
    }
    return 0;
  }
  
  // 3. 編輯距離算法
  const distance = levenshteinDistance(cleanTarget, cleanSpoken);
  const maxLen = Math.max(cleanTarget.length, cleanSpoken.length);
  const similarity = ((maxLen - distance) / maxLen) * 100;
  
  return Math.round(similarity);
}

// Levenshtein Distance
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
```

### 8.5 部署架構

**方案：用戶現有 VPS（Port 80）**

管理員需要做：
1. 將 `/opt/data/workspace/langlearn/` 複製到 server
2. 安裝 Python 依賴：`pip install -r requirements.txt`
3. 初始化數據庫：`python app.py init-db`
4. 生成所有音頻：`python generate_audio.py`
5. 配置 Nginx reverse proxy 到 port 5000
6. 設定 systemd service 自動運行

```nginx
# /etc/nginx/sites-available/langlearn
server {
    listen 80;
    server_name japanese.EddieChi.com;  # 或 IP

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }
}
```

---

## 九、實現順序

**Phase 0：內容準備（1-2小時）**
1. 寫100個 survival sentences JSON
2. 用 edge-tts 生成所有音頻文件

**Phase 1：後端改造（2-3小時）**
1. 更新 SQLAlchemy 模型（新增字段）
2. 更新 API endpoints
3. 實現 SM-2 復習邏輯
4. 測試所有 API

**Phase 2：前端核心頁面（4-5小時）**
1. Shadowing.jsx（狀態機 + 語音識別）
2. Home.jsx
3. Lesson.jsx
4. 登入/注冊頁

**Phase 3：遊戲化（2-3小時）**
1. XP 系統
2. Streak 系統
3. 等級系統
4. 成就系統

**Phase 4：部署（1小時）**
1. 提交到 GitHub
2. 管理員 deploy 到 VPS
3. 測試完整流程

**預計總工時：10-15小時**

---

## 十、驗收標準

### 功能驗收
- [ ] 用戶可以注冊/登入
- [ ] Shadowing流程：播放→跟讀→評分→下一句
- [ ] 評分算法工作正常
- [ ] XP/Streak/Level 正確計算
- [ ] SM-2 復習提醒正確
- [ ] 每日目標進度追蹤
- [ ] 成就徽章正確解鎖

### 用戶體驗驗收
- [ ] 從打開App到完成第一個句子 < 2分鐘
- [ ] Shadowing流程中每個狀態有清晰視覺反饋
- [ ] 評分結果清楚明確
- [ ] 失敗時有正向引導（「加油」而非「錯」）

### 技術驗收
- [ ] 所有 API 響應 < 500ms
- [ ] TTS 音頻生成成功
- [ ] Browser Speech Recognition 正常運作
- [ ] 部署到 Port 80 成功
- [ ] 移動端（iPhone/Android）測試通過
