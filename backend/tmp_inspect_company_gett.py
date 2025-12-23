import os, json
from file_parser import FileParser
from normalizer import Normalizer
from utils import filter_company_trips_by_supplier
from config import SUPPLIER_NAMES


def main():
    root = os.path.dirname(os.path.abspath(__file__))
    company_path = os.path.join(root, 'uploads', 'company_קובץ רייד 1125.csv')
    parser = FileParser()
    norm = Normalizer()
    company_data = parser.parse_file(company_path, 'company')
    company_norm = norm.normalize_company(company_data)
    company_filtered = filter_company_trips_by_supplier(company_norm, SUPPLIER_NAMES['GETT'])
    print('filtered count', len(company_filtered))
    target = [c for c in company_filtered if c.get('date') >= '2025-11-29']
    print('date>=2025-11-29', len(target))
    print(json.dumps(target[:5], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

