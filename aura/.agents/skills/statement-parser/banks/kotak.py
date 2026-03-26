import json
import traceback

def categorize(desc):
    d = desc.lower()
    food_keywords = [
        "food", "zomato", "swiggy", "starbucks", "tim hortons", "tims", "restaurant", "kozhi",
        "dosa", "idli", "vada", "sambar", "chutney", "biryani", "meals", "parotta", "chapati", "poori", "pongal", "upma", "bisi bele bath", "payasam", "chicken 65", "thali", "uttapam", "appam", "paniyaram", "bonda", "bajji", "kebab", "shawarma", "mandi", "tandoori", "naan", "kulcha", "pulao", "fried rice", "noodles", "momo", "gobi", "paneer", "manchurian", "soup", "filter coffee", "chai",
        "poutine", "pizza", "burger", "fries", "subway", "mcdonalds", "kfc", "wendys", "taco", "burrito", "sushi", "ramen", "pho", "wings", "bagel", "croissant", "donut", "pastry", "cake", "bacon", "steak", "bbq", "wrap", "salad", "smoothie", "boba", "bubble tea", "cafe", "bakery", "kitchen"
    ]
    if any(k in d for k in ["chicken", "meat", "grocery", "supermarket", "mart", "store", "d-mart", "reliance", "vegetable", "fruit", "milk", "dairy", "egg", "fish", "mutton"]): return "Groceries"
    if any(k in d for k in food_keywords): return "Food"
    if any(k in d for k in ["uber", "ola", "metro", "oc transpo", "petrol", "shell", "transit", "presto", "cab"]): return "Transport"
    if any(k in d for k in ["srm", "university", "coursera", "books", "ielts"]): return "Studies"
    if any(k in d for k in ["amazon", "flipkart", "walmart", "myntra"]): return "Shopping"
    if any(k in d for k in ["dress", "belt", "shirt", "pant", "shoe", "clothing", "apparel", "wear", "zara", "h&m", "uniqlo"]): return "Wearables"
    if any(k in d for k in ["netflix", "valorant", "steam", "cinema"]): return "Entertainment"
    return "Miscellaneous"

def parse(pdf_path):
    extracted_data = []
    try:
        import pdfplumber
    except ImportError:
        return {"error": "pdfplumber is not installed."}
        
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if not table: continue
            
            for row in table:
                if len(row) < 7: continue
                
                raw_date = row[1] if row[1] else ""
                raw_desc = row[2] if row[2] else ""
                ref_no = row[3] if row[3] else ""
                
                if "DESCRIPTION" in raw_desc.upper() or "CHQ" in ref_no.upper():
                    if len(ref_no) < 15 and not any(char.isdigit() for char in ref_no):
                        continue
                
                if ref_no and ("UPI-" in ref_no.upper() or len(ref_no.strip()) > 4):
                    clean_desc = raw_desc.replace('\n', ' ').strip()
                    clean_ref = ref_no.replace('\n', '').strip()
                    
                    payment_cause = "Needed input"
                    merchant = clean_desc
                    
                    if clean_desc.startswith("UPI/"):
                        parts = clean_desc.split('/')
                        if len(parts) > 1: merchant = parts[1].strip()
                        if len(parts) > 3:
                            last_segment = parts[-1].strip()
                            payment_cause = "General" if last_segment.upper() == "UPI" else last_segment
                    
                    w_amt = str(row[4]).replace(',', '').strip() if row[4] else "0"
                    d_amt = str(row[5]).replace(',', '').strip() if row[5] else "0"
                    bal = str(row[6]).replace(',', '').strip() if row[6] else "0"
                    
                    try:
                        w_val = float(w_amt) if w_amt and w_amt != "0" and w_amt != "None" else 0.0
                        d_val = float(d_amt) if d_amt and d_amt != "0" and d_amt != "None" else 0.0
                        amount = d_val if d_val > 0 else -w_val
                    except ValueError:
                        amount = 0.0

                    extracted_data.append({
                        "transaction_id": clean_ref,
                        "date": raw_date.replace('\n', ' ').strip(),
                        "raw_description": clean_desc,
                        "merchant": merchant,
                        "reason": payment_cause,
                        "category": categorize(clean_desc),
                        "amount": amount,
                        "withdrawal": w_amt if float(w_val) > 0 else "0",
                        "deposit": d_amt if float(d_val) > 0 else "0",
                        "balance": bal,
                        "currency": "INR",
                        "visibility": "Private"
                    })
    return extracted_data
