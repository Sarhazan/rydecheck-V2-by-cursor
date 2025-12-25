import os
from file_parser import FileParser
from normalizer import Normalizer
from utils import filter_company_trips_by_supplier
from config import SUPPLIER_NAMES


def main():
    root = os.path.dirname(os.path.abspath(__file__))
    company_path = os.path.join(root, 'uploads', 'company_קובץ רייד 1125.csv')
    gett_path = os.path.join(root, 'uploads', 'supplier2_דוח גט 1125.xlsx')
    parser = FileParser()
    norm = Normalizer()
    cn = norm.normalize_company(parser.parse_file(company_path, 'company'))
    cf = filter_company_trips_by_supplier(cn, SUPPLIER_NAMES['GETT'])
    gn = norm.normalize_supplier2(parser.parse_file(gett_path, 'supplier2'))
    company_ids = {c.get('trip_id') for c in cf if c.get('trip_id')}
    gett_ids = {g.get('trip_id') for g in gn if g.get('trip_id')}
    inter = company_ids & gett_ids
    print('company ids', len(company_ids), 'gett ids', len(gett_ids), 'intersection', len(inter))
    print(list(inter)[:20])


if __name__ == "__main__":
    main()

