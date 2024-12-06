import pandas as pd
from datetime import datetime, timedelta

# Generate timestamps at 15-minute intervals for the year 2024
start_date = datetime(2024, 1, 1, 0, 0, 0)
end_date = datetime(2024, 12, 1, 0, 0, 0)
timestamps = []

current_time = start_date
while current_time <= end_date:
    timestamps.append(current_time)
    current_time += timedelta(minutes=15)

# Convert to DataFrame for export
df_timestamps = pd.DataFrame(timestamps, columns=["timestamp"])
df_timestamps.to_csv('../dataset/timestamps.csv', index=False)