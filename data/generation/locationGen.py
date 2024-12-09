import requests
from bs4 import BeautifulSoup
import csv
from tqdm import tqdm
from const import MAX_PAGES

url = "https://www.pickoneplace.com/search/program"

fields = ['id', 'name', 'address', 'capacity', 'price',]
id = 1

venues = []
for i in tqdm(range(MAX_PAGES)):
    response = requests.get(url + '?page=' + str(i + 1))
    if response.status_code != 200:
        continue
    soup = BeautifulSoup(response.text, 'html.parser')
    for item in soup.select('.searchProgramContentArea'):
        name = item.select_one('.mD5 .programIcon img[alt="空間場地"]')
        name = name.find_next_sibling(string=True).strip() if name else "N/A"

        capacity = item.select_one('.programIcon img[alt="活動人數"]')
        capacity = capacity.find_next_sibling(string=True).strip() if capacity else "N/A"
        price = item.find('span', class_='btn btnHour').text.strip() if item.find('span', class_='btn btnHour') else "N/A"

        response_place = requests.get(soup.find('a', class_='logProgramClick')['href'])
        if response_place.status_code == 200:
            soup_place = BeautifulSoup(response_place.text, 'html.parser')
            location = soup_place.find('div', class_='location-block').find('p').get_text(separator=" ", strip=True) if soup_place.find('div', class_='location-block') else "N/A"
        else:
            location = "N/A"

        venues.append([id, name, location, capacity, price])
        id += 1

with open('../dataset/location.csv', 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(fields)
    writer.writerows(venues)

print("Data Saved")
