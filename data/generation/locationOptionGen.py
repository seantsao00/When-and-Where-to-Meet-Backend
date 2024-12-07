import pandas as pd
import random

meet_df = pd.read_csv("../dataset/meets.csv")
location_df = pd.read_csv("../dataset/locations.csv")


meet_ids = meet_df["id"].tolist()
location_ids = location_df["id"].tolist()

results = []

total_locations = len(location_ids)
max_share = int(0.05 * total_locations)
weights = [random.uniform(0.5, 2) for _ in location_ids]
weights = [w / sum(weights) for w in weights]

for meet_id in meet_ids:
    num_locations = random.randint(5, 10)
    selected_locations = random.choices(location_ids, weights=weights, k=num_locations)
    for location_id in selected_locations:
        results.append({"meetId": meet_id, "locationId": location_id})

location_options_df = pd.DataFrame(results)
location_options_df["id"] = range(1, len(location_options_df) + 1)
location_options_df.to_csv("../dataset/locationOptions.csv", index=False)