import sys
import json
import traceback

def extract_kotak_data(pdf_path):
    extracted_data = []
    try:
        try:
            import pdfplumber
        except ImportError:
            return {"error": "pdfplumber is not installed. Please install it on your system."}
            
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                table = page.extract_table()
                if not table: continue
                
                # Kotak 7-Column Layout: [Sl No, Date, Description, Chq/Ref, Withdrawal, Deposit, Balance]
                for row in table:
                    # Ignore short headers or empty arrays
                    if len(row) < 7: continue
                    
                    raw_date = row[1] if row[1] else ""
                    raw_desc = row[2] if row[2] else ""
                    ref_no = row[3] if row[3] else ""
                    
                    # Ignore explicit table headers
                    if "DESCRIPTION" in raw_desc.upper() or "CHQ" in ref_no.upper():
                        # If the text literally says Description or Chq/Ref. No., skip it completely
                        if len(ref_no) < 15 and not any(char.isdigit() for char in ref_no):
                            continue
                    
                    # Target explicit UPI transactions or non-empty Reference numbers that aren't column headers
                    if ref_no and ("UPI-" in ref_no.upper() or len(ref_no.strip()) > 4):
                        clean_desc = raw_desc.replace('\n', ' ').strip()
                        clean_ref = ref_no.replace('\n', '').strip()
                        
                        # Deep Parsing for UPI: UPI/Merchant/ID/Note
                        payment_cause = "Needed input"
                        merchant = clean_desc
                        
                        if clean_desc.startswith("UPI/"):
                            parts = clean_desc.split('/')
                            # parts[0]: UPI
                            # parts[1]: Merchant (e.g., paytm.s1ianv2@p or KOZHI 65)
                            # parts[2]: ID (e.g., 533720647133)
                            # parts[3]: Cause (e.g., Food or UPI)
                            
                            if len(parts) > 1:
                                merchant = parts[1].strip()
                            if len(parts) > 3:
                                last_segment = parts[-1].strip()
                                if last_segment.upper() == "UPI":
                                    payment_cause = "General"
                                else:
                                    payment_cause = last_segment
                        
                        # Clean amounts
                        w_amt = str(row[4]).replace(',', '').strip() if row[4] else "0"
                        d_amt = str(row[5]).replace(',', '').strip() if row[5] else "0"
                        bal = str(row[6]).replace(',', '').strip() if row[6] else "0"
                        
                        w_val = 0.0
                        d_val = 0.0
                        try:
                            # Parse floats
                            w_val = float(w_amt) if w_amt and w_amt != "0" and w_amt != "None" else 0.0
                            d_val = float(d_amt) if d_amt and d_amt != "0" and d_amt != "None" else 0.0
                            
                            # Final amount: negative for withdrawal
                            amount = d_val if d_val > 0 else -w_val
                        except ValueError:
                            amount = 0.0

                        # AI Categorization Logic
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
                            
                        ai_category = categorize(clean_desc)

                        extracted_data.append({
                            "transaction_id": clean_ref, # Primary Key
                            "date": raw_date.replace('\n', ' ').strip(),
                            "raw_description": clean_desc,
                            "merchant": merchant,
                            "reason": payment_cause,
                            "category": ai_category,
                            "amount": amount,
                            "withdrawal": w_amt if float(w_val) > 0 else "0",
                            "deposit": d_amt if float(d_val) > 0 else "0",
                            "balance": bal,
                            "currency": "INR",
                            "visibility": "Private"
                        })
        
        # Deduplicate transaction_ids deterministically for Supabase UPSERT
        unique_data = []
        seen_tx_ids = {}
        for item in extracted_data:
            tx_id = item["transaction_id"]
            if tx_id in seen_tx_ids:
                seen_tx_ids[tx_id] += 1
                item["transaction_id"] = f"{tx_id}-{seen_tx_ids[tx_id]}"
            else:
                seen_tx_ids[tx_id] = 0
            unique_data.append(item)
            
        return unique_data
    except Exception as e:
        return {"error": f"Parsing failed: {str(e)}\n{traceback.format_exc()}"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    data = extract_kotak_data(file_path)
    print(json.dumps(data))
