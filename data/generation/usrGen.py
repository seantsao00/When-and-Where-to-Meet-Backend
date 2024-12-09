import pandas as pd
import random
import string
from const import NUM_USRS

# Generate random Chinese names
def generate_chinese_name():
    family_names = [
        '陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊',
        '許', '鄭', '謝', '郭', '洪', '邱', '曾', '廖', '賴', '周',
        '葉', '蘇', '潘', '袁', '胡', '沈', '趙', '柯', '鍾', '范',
        '楊', '江', '曹', '方', '彭', '孫', '丁', '魏', '呂', '宋',
        '程', '傅', '馬', '曾', '余', '岳', '白', '田', '韓', '金'
    ]

    given_names = [
        '嘉豪', '怡君', '志偉', '雅婷', '家瑋', '欣怡', '建宏', '惠美', '文傑', '佩雯',
        '明杰', '心儀', '冠霖', '靜宜', '俊宏', '佳玲', '志明', '思妍', '俊傑', '婉婷',
        '德明', '欣儀', '國華', '美玲', '勝文', '玉珍', '志華', '曉婷', '偉倫', '佳慧',
        '信宏', '淑芬', '建國', '淑娟', '振華', '麗芬', '家豪', '思穎', '智翔', '秀英',
        '志誠', '宜芳', '志勇', '美琪', '志成', '若瑄', '宜萱', '美瑜', '智豪', '怡華',
        '冠宇', '麗華', '建宇', '雅文', '勝傑', '佳雯', '宏傑', '書瑋', '俊文', '雅玲',
        '明樺', '怡靜', '建志', '佳蓉', '志傑', '秀玲', '志新', '淑華', '建輝', '淑珍',
        '文豪', '怡伶', '志堅', '美惠', '志宇', '怡君', '志遠', '玉芬', '冠瑋', '秀芳',
        '智勇', '雅雯', '宏志', '淑慧', '國平', '秀文', '國基', '雅萍', '志勳', '麗萍',
        '志豪', '玉君', '國強', '美霞', '建銘', '佩玲', '志威', '美琳', '志峰', '怡欣'
    ]
    return random.choice(family_names) + random.choice(given_names)

def generate_email():
    domains = ['example.com', 'test.mail.com', 'random.mail.org', 'csie.mail.com', 'im.mail.com']
    email = ''.join(random.choices(string.ascii_letters, k=5)) + ''.join(random.choices(string.digits, k=5)) + '@' + random.choice(domains)
    return email

def generate_status():
    return random.choices(
        ['active', 'banned', 'deleted'],
        weights=[90, 3, 7],
        k=1
    )[0]

# Generate the dataset
data = []
for i in range(NUM_USRS):
    name = generate_chinese_name()
    email = generate_email()
    status = generate_status()
    data.append({'id': i+1, 'name': name, 'email': email, 'status': status})

# Convert to DataFrame
df = pd.DataFrame(data)
df.to_csv('../dataset/usrs.csv', index=False)