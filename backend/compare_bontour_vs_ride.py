import os, csv, math
import pandas as pd

BASE = r"C:\\Users\\sarha\\.openclaw\\workspace\\PROJECTS\\temp"

files = os.listdir(BASE)
bon_path = os.path.join(BASE, [f for f in files if f.endswith('.xlsx')][0])
ride_bt_path = os.path.join(BASE, [f for f in files if f.endswith('.csv') and '' not in f][1])  # second csv is ride-bon-tour

print('bon_path:', bon_path)
print('ride_bt_path:', ride_bt_path)

bon = pd.read_excel(bon_path)

# Column D (index 3) = trip ID in Bon Tour
bon_ids = set()
for v in bon.iloc[:, 3].dropna():
    s = str(v).strip()
    if not s or not s.replace('.0','').isdigit():
        continue
    try:
        bon_ids.add(int(float(s)))
    except Exception:
        continue

print('BON IDs count:', len(bon_ids))
print('BON sample:', sorted(list(bon_ids))[:10])

ride_ids = set()
with open(ride_bt_path, 'r', encoding='utf-8-sig', newline='') as f:
    reader = csv.reader(f)
    header = next(reader, None)
    for row in reader:
        if not row:
            continue
        raw = row[0].strip().strip('\ufeff').strip('"')
        if not raw or not raw.isdigit():
            continue
        ride_ids.add(int(raw))

print('RIDE IDs count:', len(ride_ids))
print('RIDE sample:', sorted(list(ride_ids))[:10])

only_in_bon = sorted(bon_ids - ride_ids)
only_in_ride = sorted(ride_ids - bon_ids)
print('in_bon_not_in_ride_count:', len(only_in_bon))
print('in_bon_not_in_ride:', only_in_bon[:50])
print('in_ride_not_in_bon_count:', len(only_in_ride))
print('in_ride_not_in_bon sample:', only_in_ride[:20])
