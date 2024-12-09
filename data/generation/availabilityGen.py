import random
import pandas as pd
from datetime import datetime, timedelta
from tqdm import tqdm

# Helper function to generate random timestamps within a range, in 15-minute intervals
def generate_time_slots(start_time, end_time):
    time_slots = []
    current_time = start_time
    while current_time < end_time:
        time_slots.append(current_time)
        current_time += timedelta(minutes=15)
    return time_slots

# Generate availability data
def generate_availability(meetings, users, location_options, joins):
    availability_data = []
    is_available_at_data = []
    id_counter = 1

    # Use a set to track unique availability combinations
    unique_availabilities = set()

    for meet in tqdm(meetings):
        meet_start_date = datetime.strptime(meet["start_date"], "%Y-%m-%d")
        meet_end_date = datetime.strptime(meet["end_date"], "%Y-%m-%d")
        meet_start_time = datetime.strptime(meet["start_time"], "%H:%M:%S")
        meet_end_time = datetime.strptime(meet["end_time"], "%H:%M:%S")

        for join in [j for j in joins if j["meet_id"] == meet["id"]]:
            user = next(user for user in users if user["id"] == join["usr_id"])
            if join["is_pending"]:
                continue

            total_slots = len(generate_time_slots(meet_start_time, meet_end_time)) * ((meet_end_date - meet_start_date).days + 1)
            required_slots = random.randint(int(total_slots * 0.2), int(total_slots * 0.33))

            available_slots = []
            while len(available_slots) < required_slots:
                availability_date = meet_start_date + timedelta(days=random.randint(0, (meet_end_date - meet_start_date).days))
                slots = generate_time_slots(meet_start_time, meet_end_time)
                segment_start_index = random.randint(0, len(slots) - 1)
                segment_length = min(required_slots - len(available_slots), len(slots) - segment_start_index)
                available_slots.extend(
                    [availability_date.strftime("%Y-%m-%d") + " " + slot.strftime("%H:%M:%S") for slot in slots[segment_start_index:segment_start_index + segment_length]]
                )

            for timestamp in available_slots:
                # Ensure uniqueness in {usr_id, meet_id, time_segment}
                availability_key = (user["id"], meet["id"], timestamp)
                if availability_key in unique_availabilities:
                    continue

                unique_availabilities.add(availability_key)

                availability_data.append({
                    "id": id_counter,
                    "usr_id": user["id"],
                    "meet_id": meet["id"],
                    "time_segment": timestamp
                })

                # Generate unique locationOptionIds for IsAvailableAt (3-5 unique per availability)
                num_location_options = random.randint(3, 5)
                valid_location_options = [opt for opt in location_options if opt["meet_id"] == meet["id"]]
                selected_options = set()

                while len(selected_options) < num_location_options and valid_location_options:
                    location_option = random.choice(valid_location_options)
                    selected_options.add(location_option["id"])

                for location_option_id in selected_options:
                    is_available_at_data.append({
                        "location_option_id": location_option_id,
                        "availability_id": id_counter
                    })

                id_counter += 1

    return pd.DataFrame(availability_data), pd.DataFrame(is_available_at_data)

# Load data from CSV files
meetings = pd.read_csv("../dataset/meet.csv").to_dict(orient="records")
users = pd.read_csv("../dataset/usr.csv").to_dict(orient="records")
location_options = pd.read_csv("../dataset/location_option.csv").to_dict(orient="records")
joins = pd.read_csv("../dataset/participation.csv").to_dict(orient="records")

availability_df, is_available_at_df = generate_availability(meetings, users, location_options, joins)

# Save the generated data to CSV files
availability_df.to_csv("../dataset/availability.csv", index=False)
is_available_at_df.to_csv("../dataset/availability_location.csv", index=False)
