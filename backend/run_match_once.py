import os
import requests

def main():
    root = os.path.dirname(os.path.abspath(__file__))
    company = os.path.join(root, "uploads", "company_קובץ רייד 1125.csv")
    gett = os.path.join(root, "uploads", "supplier2_דוח גט 1125.xlsx")
    print("company", company, os.path.exists(company))
    print("gett   ", gett, os.path.exists(gett))
    payload = {"company": company, "gett": gett}
    resp = requests.post("http://localhost:5000/api/match-gett", json=payload)
    print("status", resp.status_code)
    print(resp.text[:800])
    if resp.ok:
        data = resp.json()
        res = data.get("results", data)
        m = res.get("matches", {}).get("supplier2", [])
        extra = res.get("extra_in_suppliers", {}).get("supplier2", [])
        miss = res.get("missing_in_suppliers", {}).get("supplier2", [])
        print("counts", len(m), len(extra), len(miss))

if __name__ == "__main__":
    main()

