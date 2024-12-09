import pandas as pd

# 讀取 CSV 檔案
csv_file_path = "data/dataset/availability.csv"

# 加載資料
availability = pd.read_csv(csv_file_path)

# 確保時間段格式統一
availability['time_segment'] = pd.to_datetime(availability['time_segment'])

# 找出真正的重複項
duplicates = availability[availability.duplicated(subset=['usr_id', 'meet_id', 'time_segment'], keep=False)]

# 顯示重複的行
if not duplicates.empty:
    print("以下是重複的 {usr_id, meet_id, time_segment} 記錄：")
    print(duplicates)
else:
    print("沒有發現重複的 {usr_id, meet_id, time_segment} 記錄。")
