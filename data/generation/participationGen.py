import pandas as pd
import random

user_df = pd.read_csv("../dataset/usr.csv")
meet_df = pd.read_csv("../dataset/meet.csv")

user_ids = user_df["id"].tolist()
meet_ids = meet_df["id"].tolist()

results = []

for user_id in user_ids:
    base_meets = random.randint(3, 6)

    if random.random() < 0.1:
        num_meets = random.randint(50, 100)
    elif random.random() < 0.1:
        num_meets = random.randint(0, 2)
    else:
        num_meets = base_meets

    selected_meets = random.sample(meet_ids, num_meets)
    for meet_id in selected_meets:
        is_pending = random.random() < 0.02
        results.append({"user_id": user_id, "meet_id": meet_id, "is_pending": is_pending})

user_meets_df = pd.DataFrame(results)

user_meets_df.to_csv("../dataset/participation.csv", index=False)