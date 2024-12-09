import pandas as pd
from tqdm import tqdm
import random

# 讀取 CSV 檔案
meets_file_path = "../dataset/meets.csv"
availability_file_path = "../dataset/availability.csv"
is_available_at_file_path = "../dataset/isAvailableAt.csv"
location_option_file_path = "../dataset/locationOptions.csv"
location_file_path = "../dataset/locations.csv"
output_file_path = "../dataset/finalDecision.csv"

# 加載 CSV 資料
meets = pd.read_csv(meets_file_path)
availability = pd.read_csv(availability_file_path)
is_available_at = pd.read_csv(is_available_at_file_path)
location_option = pd.read_csv(location_option_file_path)
locations = pd.read_csv(location_file_path)

# 合併資料
availability_with_locations = availability.merge(
    is_available_at, left_on='id', right_on='availabilityId', how='inner'
).merge(
    location_option, left_on='locationOptionId', right_on='id', how='inner', suffixes=('', '_location')
).merge(
    locations, left_on='locationId', right_on='id', how='inner', suffixes=('', '_final')
)

final_results = []
used_combinations = set()

# 計算每個會議的最終時間和地點
for meet_id in tqdm(meets['id'].unique()):
    if random.choices([True, False], weights=[1, 15])[0]:
        continue
    meet_availabilities = availability_with_locations[availability_with_locations['meetId'] == meet_id]
    if not meet_availabilities.empty:
        group_counts = meet_availabilities.groupby(['timestamp', 'locationId']).size()
        if not group_counts.empty:
            for combination, _ in group_counts.sort_values(ascending=False).items():
                final_time, final_place_id = combination
                if (final_time, final_place_id) not in used_combinations:
                    used_combinations.add((final_time, final_place_id))
                    final_results.append({
                        "meetId": meet_id,
                        "finalPlaceId": int(final_place_id),
                        "finalTime": final_time
                    })
                    break

# 將結果轉為 DataFrame 並儲存
final_results_df = pd.DataFrame(final_results)
final_results_df.to_csv(output_file_path, index=False)

print(f"Final results saved to {output_file_path}.")
