import pandas as pd
from tqdm import tqdm
import random
from datetime import timedelta

# 讀取 CSV 檔案
meets_file_path = "../dataset/meet.csv"
availability_file_path = "../dataset/availability.csv"
is_available_at_file_path = "../dataset/availability_location.csv"
location_option_file_path = "../dataset/location_option.csv"
location_file_path = "../dataset/location.csv"
output_file_path = "../dataset/final_decision.csv"

# 加載 CSV 資料
meets = pd.read_csv(meets_file_path)
availability = pd.read_csv(availability_file_path)
is_available_at = pd.read_csv(is_available_at_file_path)
location_option = pd.read_csv(location_option_file_path)
locations = pd.read_csv(location_file_path)

# 合併資料
availability_with_locations = availability.merge(
    is_available_at, left_on='id', right_on='availability_id', how='inner'
).merge(
    location_option, left_on='location_option_id', right_on='id', how='inner', suffixes=('', '_location')
).merge(
    locations, left_on='location_id', right_on='id', how='inner', suffixes=('', '_final')
)

final_results = []
used_combinations = {}  # key: location_id, value: list of (start_time, end_time)

# 計算每個會議的最終時間和地點
for _, meet in tqdm(meets.iterrows(), total=meets.shape[0]):
    meet_id = meet['id']
    start_time = pd.to_datetime(meet['start_time'])
    end_time = start_time + pd.to_timedelta(meet['duration'])

    # 隨機跳過部分會議（15%）
    if random.choices([True, False], weights=[1, 15])[0]:
        continue

    meet_availabilities = availability_with_locations[availability_with_locations['meet_id'] == meet_id]
    if not meet_availabilities.empty:
        group_counts = meet_availabilities.groupby(['time_segment', 'location_id']).size()
        if not group_counts.empty:
            for combination, _ in group_counts.sort_values(ascending=False).items():
                final_time = pd.to_datetime(combination[0])
                final_place_id = combination[1]

                # 計算候選時間範圍
                candidate_start = final_time
                candidate_end = final_time + pd.to_timedelta(meet['duration'])

                # 檢查時間是否與其他會議重疊
                overlap = False
                if final_place_id in used_combinations:
                    for existing_start, existing_end in used_combinations[final_place_id]:
                        if not (candidate_end <= existing_start or candidate_start >= existing_end):
                            overlap = True
                            break

                if not overlap:
                    # 標記地點和時間段已被使用
                    if final_place_id not in used_combinations:
                        used_combinations[final_place_id] = []
                    used_combinations[final_place_id].append((candidate_start, candidate_end))

                    final_results.append({
                        "meet_id": meet_id,
                        "final_place_id": int(final_place_id),
                        "final_time": candidate_start
                    })
                    break

# 將結果轉為 DataFrame 並儲存
final_results_df = pd.DataFrame(final_results)
final_results_df.to_csv(output_file_path, index=False)

print(f"Final results saved to {output_file_path}.")
