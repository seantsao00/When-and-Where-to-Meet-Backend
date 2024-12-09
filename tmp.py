import pandas as pd

# 讀取 CSV 檔案
csv_file_path = "data/dataset/availability_location.csv"

# 加載資料
availability_location = pd.read_csv(csv_file_path)

# 移除 'id' 欄位
availability_location = availability_location.drop(columns=['id'])

# 儲存結果到新的 CSV
availability_location.to_csv(csv_file_path, index=False)

print(f"Updated CSV without 'id' column saved to {csv_file_path}.")