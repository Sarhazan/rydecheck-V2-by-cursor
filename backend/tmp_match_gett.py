import os
import requests
import json


def main():
    root = os.path.dirname(os.path.abspath(__file__))
    company = os.path.join(root, "uploads", "company_קובץ רייד 1125.csv")
    # try two gett filenames
    gett_candidates = [
        os.path.join(root, "uploads", "supplier2_1125.xlsx"),
        os.path.join(root, "uploads", "supplier2_דוח גט 1125.xlsx"),
    ]
    gett = next((g for g in gett_candidates if os.path.exists(g)), gett_candidates[-1])
    print("company path", company, "exists", os.path.exists(company))
    print("gett path", gett, "exists", os.path.exists(gett))
    payload = {"company": company, "gett": gett}
    resp = requests.post("http://localhost:5000/api/match-gett", json=payload)
    print("status", resp.status_code)
    print(resp.text[:800])
    if resp.ok:
        data = resp.json()
        # show counts
        matches = data.get("results", {}).get("matches", {}).get("supplier2", [])
        unmatched_gett = data.get("results", {}).get("extra_in_suppliers", {}).get("supplier2", [])
        unmatched_company = data.get("results", {}).get("missing_in_suppliers", {}).get("supplier2", [])
        print("counts:", len(matches), len(unmatched_gett), len(unmatched_company))


if __name__ == "__main__":
    main()

