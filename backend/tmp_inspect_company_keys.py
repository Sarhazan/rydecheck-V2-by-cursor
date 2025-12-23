import os
from file_parser import FileParser


def main():
    root = os.path.dirname(os.path.abspath(__file__))
    company_path = os.path.join(root, 'uploads', 'company_קובץ רייד 1125.csv')
    parser = FileParser()
    data = parser.parse_file(company_path, 'company')
    first = data[0]
    print("first keys:", list(first.keys())[:30])
    for k, v in first.items():
        if 'שעת' in str(k):
            print("time key", k, v)


if __name__ == "__main__":
    main()

