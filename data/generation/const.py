from datetime import datetime

NUM_USERS = 2000
NUM_MEETS = 10256
MAX_PAGES = 154
NUM_LOCATIONS = 1540
MEET_DESCRIPTION = {
    "work": {
        "prefixes" : ["專案會議", "團隊聚會", "公司簡報", "產品研討", "技術討論", "年度大會", "策略會議", "工作坊", "培訓活動", "部門會議"],
        "suffixes" : ["計畫", "日程", "討論", "檢討", "報告", "總結", "更新", "安排", "計劃", "重點"],
        "reasons": [
            "這次會議主要討論未來的發展方向與策略。",
            "我們將聚焦於團隊協作提升效率。",
            "本次會議旨在解決現有的產品問題。",
            "計劃討論公司年度報表與績效。",
            "這是一個技術分享與創新頭腦風暴的場合。",
            "將進行重要項目的階段性匯報與檢討。",
            "此次聚會為團隊建設，增強凝聚力。",
            "重點更新公司的市場推廣計劃。",
            "會議目的是整理當前的資源分配方案。",
            "針對最新的政策變化進行應對討論。", 
            "認真衝業績啊你各位。", 
        ]
    },
    "study": {
        "prefixes": ["期末報告", "專題作業", "小組討論", "學習計劃", "實驗報告", "模擬考試", "課堂簡報", "競賽準備", "數據分析"],
        "suffixes": ["檢討", "安排", "報告", "討論", "分工", "計畫", "進度", "總結", "更新", "分析"],
        "reasons": [
            "討論即將到來的期末報告分工與進度。",
            "準備小組作業並確認研究方向。",
            "核對課堂筆記與學習重點。",
            "討論畢業專題計劃與初步內容框架。",
            "協調團隊研究報告的內容格式與細節。",
            "解決數學作業中難題的討論會。",
            "為即將舉行的模擬考制定復習計劃。",
            "計劃參加學術競賽並分配各自任務。",
            "準備課堂簡報內容與練習展示技巧。",
            "討論實驗報告中的數據分析結果。",
            "大家來臨時報佛腳，不想被當掉 QQ。",
        ]
    },
    "gathering": {
        "prefixes": ["週末晚餐", "聚會", "興趣分享", "咖啡廳聚會", "戶外遊戲", "輕鬆聚會"],
        "suffixes": ["計畫", "討論", "細節", "安排", "菜單", "規劃", "主題", "日程", "清單", "計劃"],
        "reasons": [
            "計劃一場週五晚餐聚會的主題與菜單。",
            "商討聚會中遊戲與活動的安排。",
            "討論電影之夜的片單與時間。",
            "決定週末桌遊活動的地點與人數。",
            "討論好友聚會中的分工與飲料準備。",
            "咖啡廳聚會，聊聊天。",
            "計劃在郊外舉行的音樂分享會。",
            "戶外燒烤活動購物。",
            "輕鬆聚會，聊聊天。",
            "要見面了ㄟ，嗚嗚嗚嗚嗚嗚好爽喔！",
        ]
    },
}