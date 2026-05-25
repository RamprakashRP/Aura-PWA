import re
import hashlib
from datetime import datetime

def categorize(desc):
    # This is a safe fallback/stub for hdfc.py and jio.py that might try to import it from kotak
    d = desc.lower()
    if any(k in d for k in ["chicken", "meat", "grocery", "supermarket", "mart", "store", "d-mart", "reliance", "vegetable", "fruit", "milk", "dairy", "egg", "fish", "mutton"]):
        return "Groceries"
    if any(k in d for k in ["food", "zomato", "swiggy", "starbucks", "tim", "restaurant", "kozhi"]):
        return "Food"
    if any(k in d for k in ["uber", "ola", "metro", "transit", "petrol", "shell", "presto", "cab"]):
        return "Transport"
    if any(k in d for k in ["srm", "university", "coursera", "books", "ielts"]):
        return "Studies"
    if any(k in d for k in ["amazon", "flipkart", "walmart", "myntra"]):
        return "Shopping"
    if any(k in d for k in ["dress", "belt", "shirt", "pant", "shoe", "clothing", "apparel", "wear", "zara", "h&m", "uniqlo"]):
        return "Wearables"
    if any(k in d for k in ["netflix", "valorant", "steam", "cinema"]):
        return "Entertainment"
    return "Miscellaneous"

def parse(pdf_path):
    extracted_data = []
    try:
        import pdfplumber
    except ImportError:
        return {"error": "pdfplumber is not installed."}
        
    date_pattern = re.compile(r'\b\d{2}\s+[A-Za-z]{3}\s+\d{4}\b')

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table({
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
                "snap_y_tolerance": 5,
                "snap_x_tolerance": 5
            })
            if not table:
                continue
            
            for idx, row in enumerate(table):
                try:
                    if not row or len(row) != 7:
                        continue
                    
                    # Row columns:
                    # 0: Sl No
                    # 1: Date
                    # 2: Description
                    # 3: Chq/Ref. No.
                    # 4: Withdrawal (Dr.)
                    # 5: Deposit (Cr.)
                    # 6: Balance
                    
                    date_val = str(row[1]).strip() if row[1] else ""
                    if not date_pattern.match(date_val):
                        continue
                    
                    description = str(row[2]).strip() if row[2] else ""
                    if "OPENING BALANCE" in description.upper():
                        continue
                    
                    # Clean up description (preserve 1:1, replace newlines with spaces)
                    description = description.replace('\n', ' ').strip()
                    description = re.sub(r'\s+', ' ', description)
                    
                    ref_no = str(row[3]).strip() if row[3] else ""
                    
                    # Parse financial values
                    def clean_float(val):
                        if not val:
                            return 0.0
                        clean = str(val).strip().replace(',', '')
                        if not clean or clean == '-' or clean.upper() == 'NONE':
                            return 0.0
                        try:
                            return float(clean)
                        except ValueError:
                            return 0.0

                    w_val = clean_float(row[4])
                    d_val = clean_float(row[5])
                    bal_val = str(row[6]).strip() if row[6] else "0"
                    
                    amount = d_val if d_val > 0 else -w_val
                    if w_val == 0.0 and d_val == 0.0:
                        continue
                        
                    # Generate uniquely identifiable transaction references
                    clean_ref = ref_no if ref_no and ref_no != '-' else ""
                    t_ref = clean_ref
                    if not t_ref:
                        desc_hash = hashlib.md5(description.encode('utf-8')).hexdigest()[:8].upper()
                        t_ref = f"KOTAK-{date_val.replace(' ', '')}-{desc_hash}-{idx}"
                    
                    # Extract the custom categories using categorize function
                    category = categorize(description)
                    
                    extracted_data.append({
                        "transaction_id": t_ref,
                        "date": date_val,
                        "raw_description": description,
                        "description": description,
                        "amount": amount,
                        "withdrawal": str(w_val) if w_val > 0 else "0",
                        "deposit": str(d_val) if d_val > 0 else "0",
                        "balance": bal_val,
                        "currency": "INR",
                        "category": category,
                        "visibility": "Private"
                    })
                except Exception:
                    continue
                    
    return extracted_data
