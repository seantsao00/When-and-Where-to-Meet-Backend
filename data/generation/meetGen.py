import random
import pandas as pd
from const import *
from datetime import datetime, timedelta

def generate_meeting_name(meeting_type):
    prefixes = MEET_DESCRIPTION[meeting_type]["prefixes"]
    suffixes = MEET_DESCRIPTION[meeting_type]["suffixes"]
    return random.choice(prefixes) + random.choice(suffixes)

def generate_description(meeting_type):
    return random.choice(MEET_DESCRIPTION[meeting_type]["reasons"])

def generate_public_status():
    return random.choices([True, False], weights=[1, 2], k=1)[0]

def generate_status():
    return random.choices(['active', 'deleted'], weights=[10, 1], k=1)[0]

def generate_weighted_ids(total, concentration_ratio):
    high_weight_count = max(1, int(total * concentration_ratio))
    high_weight_ids = random.sample(range(1, total + 1), high_weight_count)
    weights = [10 if i in high_weight_ids else 1 for i in range(1, total + 1)]
    return weights

def generate_random_date(start_date, end_date):
    days_between = (end_date - start_date).days
    random_days = random.randint(0, days_between)
    return start_date + timedelta(days=random_days)

def generate_random_time(start_time, end_time):
    time_options = []
    current_time = start_time
    while current_time <= end_time:
        time_options.append(current_time)
        current_time += timedelta(minutes=15)
    return random.choice(time_options)

def generate_schedule():
    start_date = generate_random_date(datetime.strptime("2022-01-03", "%Y-%m-%d"), datetime.strptime("2024-12-05", "%Y-%m-%d"))
    end_date = start_date + timedelta(days=random.randint(0, 20))
    while True:
        start_time = generate_random_time(datetime.strptime("07:00:00", "%H:%M:%S"), datetime.strptime("18:00:00", "%H:%M:%S"))
        end_time = generate_random_time(datetime.strptime("11:00:00", "%H:%M:%S"), datetime.strptime("23:00:00", "%H:%M:%S"))
        if start_time < end_time:
            break
    return start_time.strftime("%H:%M:%S"), end_time.strftime("%H:%M:%S"), start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")

place_weights = generate_weighted_ids(NUM_LOCATIONS, 0.02)
holder_weights = generate_weighted_ids(NUM_USRS, 0.02)

data = []
for i in range(NUM_MEETS):
    meeting_type = random.choice(list(MEET_DESCRIPTION.keys()))
    start_time, end_time, start_date, end_date = generate_schedule()
    duration_minutes = random.randint(1, 12) * 15
    duration_interval = f"{duration_minutes // 60} hours {duration_minutes % 60} minutes"
    data.append({
        "id": i + 1,
        "is_public": generate_public_status(),
        "name": generate_meeting_name(meeting_type),
        "status": generate_status(),
        "description": generate_description(meeting_type),
        "holder_id": random.choices(range(1, NUM_USRS + 1), weights=holder_weights, k=1)[0],
        "start_time": start_time,
        "end_time": end_time,
        "start_date": start_date,
        "end_date": end_date,
        "duration": duration_interval
    })

df_meetings = pd.DataFrame(data)
df_meetings.to_csv('../dataset/meet.csv', index=False)
