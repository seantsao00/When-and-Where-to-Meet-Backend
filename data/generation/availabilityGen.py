import random
import pandas as pd
from datetime import datetime, timedelta

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
    final_meeting_times = []
    id_counter = 1
    is_available_at_id_counter = 1

    for meet in meetings:
        meet_start_date = datetime.strptime(meet["startDate"], "%Y-%m-%d")
        meet_end_date = datetime.strptime(meet["endDate"], "%Y-%m-%d")
        meet_start_time = datetime.strptime(meet["startTime"], "%H:%M:%S")
        meet_end_time = datetime.strptime(meet["endTime"], "%H:%M:%S")

        # Collect all user availabilities for this meeting
        user_availabilities = []
        for join in [j for j in joins if j["meetId"] == meet["id"]]:
            user = next(user for user in users if user["id"] == join["userId"])
            if join["isPending"]:
                continue

            # Calculate total meeting time slots
            total_slots = len(generate_time_slots(meet_start_time, meet_end_time)) * ((meet_end_date - meet_start_date).days + 1)
            required_slots = random.randint(int(total_slots * 0.2), int(total_slots * 0.33))

            # Generate availability slots for this user in the meeting
            available_slots = []
            while len(available_slots) < required_slots:
                availability_date = meet_start_date + timedelta(days=random.randint(0, (meet_end_date - meet_start_date).days))
                slots = generate_time_slots(meet_start_time, meet_end_time)
                segment_start_index = random.randint(0, len(slots) - 1)
                segment_length = min(required_slots - len(available_slots), len(slots) - segment_start_index)
                available_slots.extend([availability_date.strftime("%Y-%m-%d") + " " + slot.strftime("%H:%M:%S") for slot in slots[segment_start_index:segment_start_index + segment_length]])

            for timestamp in available_slots:
                availability_data.append({
                    "id": id_counter,
                    "userId": user["id"],
                    "meetId": meet["id"],
                    "timestamp": timestamp
                })

                # Generate multiple locationOptionIds for IsAvailableAt
                num_location_options = random.randint(1, 3)  # Each availability can have 1-3 location options
                for _ in range(num_location_options):
                    location_option = random.choice(location_options)
                    is_available_at_data.append({
                        "id": is_available_at_id_counter,
                        "locationOptionId": location_option["id"],
                        "availabilityId": id_counter
                    })
                    is_available_at_id_counter += 1

                id_counter += 1

            user_availabilities.extend(available_slots)

        # Determine the best meeting final time
        time_counts = {}
        for timestamp in user_availabilities:
            date, time = timestamp.split(" ")
            time_counts[time] = time_counts.get(time, 0) + 1

        most_common_time = max(time_counts, key=time_counts.get) if time_counts else meet["startTime"]
        final_meeting_times.append({
            "meetId": meet["id"],
            "finalTime": most_common_time
        })

    return pd.DataFrame(availability_data), pd.DataFrame(is_available_at_data), pd.DataFrame(final_meeting_times)

# Load data from CSV files
meetings = pd.read_csv("../dataset/meets.csv").to_dict(orient="records")
users = pd.read_csv("../dataset/users.csv").to_dict(orient="records")
location_options = pd.read_csv("../dataset/locationOptions.csv").to_dict(orient="records")
joins = pd.read_csv("../dataset/joins.csv").to_dict(orient="records")

availability_df, is_available_at_df, final_meeting_times_df = generate_availability(meetings, users, location_options, joins)

# Save the generated data to CSV files
availability_df.to_csv("../dataset/availability.csv", index=False)
is_available_at_df.to_csv("../dataset/isAvailableAt.csv", index=False)

# Update meetings CSV with final meeting times
meetings_df = pd.read_csv("../dataset/meets.csv")
final_times_df = pd.DataFrame(final_meeting_times_df)
updated_meetings_df = pd.merge(meetings_df, final_times_df, how="left", left_on="id", right_on="meetId")
updated_meetings_df.to_csv("../dataset/meets.csv", index=False)
