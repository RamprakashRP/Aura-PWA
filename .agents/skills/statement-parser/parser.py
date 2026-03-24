import csv
import json
import sys
import os
import re
from datetime import datetime
try:
    from thefuzz import process, fuzz
except ImportError:
    print(json.dumps({"error": "thefuzz package is required. Run pip install thefuzz"}))
    sys.exit(1)

# Default Historical Categories (Mock DB query result for fuzzy matching)
HISTORICAL_MAPPINGS = {
    "Zomato": "Food",
    "Swiggy": "Food",
    "Uber": "Transport",
    "Amazon": "Shopping",
    "Netflix": "Entertainment",
    "UPI/Note: Rent": "House Expenses",
    "Salary": "Income"
}

def extract_upi_note(description):
    """Extract UPI note from typical Indian bank descriptions."""
    match = re.search(r'UPI/(?:Note|Ref):?\s*([^/\-\n\r]+)', description, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None

def smart_categorize(description, note):
    """Use thefuzz to match the description against historical known entities."""
    search_term = note if note else description
    
    # Fuzzy match against known merchants/notes
    choices = list(HISTORICAL_MAPPINGS.keys())
    best_match, score = process.extractOne(search_term, choices, scorer=fuzz.token_sort_ratio)
    
    if score >= 70:  # 70% confidence threshold
        return HISTORICAL_MAPPINGS[best_match]
    
    return "Uncategorized"

def parse_csv(file_path):
    transactions = []
    
    try:
        with open(file_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            # Normalize headers
            headers = [h.strip().lower() for h in reader.fieldnames]
            
            # Autodetect column names
            date_col = next((h for h in headers if 'date' in h), None)
            amount_col = next((h for h in headers if 'amount' in h or 'credit' in h or 'debit' in h), None)
            desc_col = next((h for h in headers if 'description' in h or 'narration' in h or 'particulars' in h), None)
            
            if not all([date_col, amount_col, desc_col]):
                return {"error": "Could not auto-detect Date, Amount, and Description columns in CSV."}

            f.seek(0)
            next(reader) # skip header
            
            for row in reader:
                # Lowercase keys to match mapped cols
                row_normalized = {k.strip().lower(): v for k, v in row.items()}
                
                date_str = row_normalized.get(date_col, '')
                amount_str = row_normalized.get(amount_col, '0').replace(',', '')
                desc = row_normalized.get(desc_col, '')
                
                try:
                    amount = float(amount_str)
                except ValueError:
                    continue  # Skip invalid amount rows
                
                note = extract_upi_note(desc)
                category = smart_categorize(desc, note)
                
                transactions.append({
                    "date": date_str,
                    "amount": amount,
                    "description": desc,
                    "note": note,
                    "category": category
                })
                
        return {"success": True, "transactions": transactions}
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python parser.py <path_to_csv>"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File not found: {file_path}"}))
        sys.exit(1)
        
    result = parse_csv(file_path)
    print(json.dumps(result, indent=2))
