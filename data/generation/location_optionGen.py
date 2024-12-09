import pandas as pd
import random

meet_df = pd.read_csv("../dataset/meet.csv")
location_df = pd.read_csv("../dataset/location.csv")

meet_ids = meet_df["id"].tolist()
location_ids = location_df["id"].tolist()

results = set()

total_locations = len(location_ids)
max_share = int(0.05 * total_locations)
weights = [random.uniform(0.5, 2) for _ in location_ids]
weights = [w / sum(weights) for w in weights]

for meet_id in meet_ids:
    num_locations = random.randint(5, 10)
    selected_locations = set()
    while len(selected_locations) < num_locations:
        location_id = random.choices(location_ids, weights=weights, k=1)[0]
        if (meet_id, location_id) not in results:
            results.add((meet_id, location_id))
            selected_locations.add(location_id)

location_options_df = pd.DataFrame()
location_options_df["id"] = range(1, len(location_options_df) + 1)
location_options_df = pd.DataFrame(list(results), columns=["meet_id", "location_id"])
location_options_df.to_csv("../dataset/location_option.csv", index=False)

print("Location options generated with no duplicates.")
