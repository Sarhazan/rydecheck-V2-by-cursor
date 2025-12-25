import os
from file_parser import FileParser
from normalizer import Normalizer
from utils import filter_company_trips_by_supplier
from config import SUPPLIER_NAMES


def main():
    root = os.path.dirname(os.path.abspath(__file__))
    company_path = os.path.join(root, 'uploads', 'company_קובץ רייד 1125.csv')
    parser = FileParser()
    norm = Normalizer()
    data = parser.parse_file(company_path, 'company')
    cn = norm.normalize_company(data)
    cf = filter_company_trips_by_supplier(cn, SUPPLIER_NAMES['GETT'])
    dates = [c.get('date', '') for c in cf if c.get('date')]
    print("filtered", len(cf))
    if dates:
        print("min date", min(dates))
        print("max date", max(dates))
        print("dates >=2025-11-30", sum(1 for d in dates if d >= '2025-11-30'))
    else:
        print("no dates")


if __name__ == "__main__":
    main()

