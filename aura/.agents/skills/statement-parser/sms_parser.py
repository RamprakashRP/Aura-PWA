import sys
import os
# Insert local packages to sys.path if they exist
_current_dir = os.path.dirname(os.path.abspath(__file__))
_local_packages = os.path.join(_current_dir, '.python_packages')
if os.path.exists(_local_packages):
    sys.path.insert(0, _local_packages)

import json
import re
import hashlib
from datetime import datetime

# Category keywords (similar to front-end and Kotak parser)
CATEGORY_KEYWORDS = {
    "Groceries": ["chicken", "meat", "grocery", "supermarket", "mart", "store", "d-mart", "reliance", "vegetable", "fruit", "milk", "dairy", "egg", "fish", "mutton"],
    "Food": ["food", "zomato", "swiggy", "starbucks", "tim", "restaurant", "kozhi", "dosa", "idli", "biryani", "meals", "pizza", "burger", "fries", "cafe", "bakery", "kitchen"],
    "Transport": ["uber", "ola", "metro", "transit", "petrol", "shell", "presto", "cab"],
    "Studies": ["srm", "university", "coursera", "books", "ielts"],
    "Shopping": ["amazon", "flipkart", "walmart", "myntra"],
    "Wearables": ["dress", "belt", "shirt", "pant", "shoe", "clothing", "apparel", "wear", "zara", "h&m", "uniqlo"],
    "Entertainment": ["netflix", "valorant", "steam", "cinema"]
}

def auto_categorize(description):
    d = description.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(k in d for k in keywords):
            return category
    return "Miscellaneous"

def parse_sms(sender, message):
    # Clean up double spaces and newlines
    message_clean = re.sub(r'\s+', ' ', message).strip()
    
    print(f"[DEBUG] Parsing SMS: sender=\"{sender}\", message=\"{message_clean}\"", file=sys.stderr)
    
    # 1. Amount Extraction
    amount = None
    currency = "INR"
    
    # Clean numeric scanner to capture any dollar or rupee amount regardless of position
    amount_match = re.search(r'(Rs\.?|INR|CAD|\$)\s*([0-9,]+\.[0-9]{2})', message_clean, re.IGNORECASE)
    if amount_match:
        currency_indicator = amount_match.group(1).upper()
        amount_str = amount_match.group(2).replace(',', '')
        amount = float(amount_str)
        if "CAD" in currency_indicator or "$" in currency_indicator:
            currency = "CAD"
        else:
            currency = "INR"
        print(f"[DEBUG] Matched currency amount: indicator={currency_indicator}, amount={amount}", file=sys.stderr)
    else:
        # Fallback: scan for any decimal number with 2 decimal digits
        fallback_match = re.search(r'\b([0-9,]+\.[0-9]{2})\b', message_clean)
        if fallback_match:
            amount = float(fallback_match.group(1).replace(',', ''))
            currency = "CAD" if ("CAD" in message_clean.upper() or "$" in message_clean) else "INR"
            print(f"[DEBUG] Fallback amount match (no symbol): amount={amount}, default_currency={currency}", file=sys.stderr)
            
    if amount is None:
        print(f"[PARSER ERROR] Failed to match regex for string: \"{message_clean}\"", file=sys.stderr)
        return {"error": f"Failed to match regex for string: \"{message_clean}\""}
        
    # 2. Action Detection
    is_outgoing = any(kw in message_clean.lower() for kw in ["debited", "spent", "paid", "charged", "txn", "withdrawn"])
    is_incoming = any(kw in message_clean.lower() for kw in ["credited", "received", "deposited"])
    
    if is_outgoing:
        signed_amount = -abs(amount)
        print(f"[DEBUG] Action detected: OUTGOING (debit)", file=sys.stderr)
    elif is_incoming:
        signed_amount = abs(amount)
        print(f"[DEBUG] Action detected: INCOMING (credit)", file=sys.stderr)
    else:
        # Default to outgoing (expense) if unspecified
        signed_amount = -abs(amount)
        print(f"[DEBUG] Action unspecified: Defaulting to OUTGOING (debit)", file=sys.stderr)
        
    # 3. Merchant/Receiver Extraction
    merchant = ""
    # Look for patterns starting with to, at, or towards
    merchant_match = re.search(r'\b(?:to|at|towards)\s+([a-zA-Z0-9\s\.\&\-\']+)', message_clean, re.IGNORECASE)
    if merchant_match:
        raw_merchant = merchant_match.group(1).strip()
        
        # Safe trimming of standard bank trailing fluff
        fluff_keywords = [
            r'\bref\b', r'\bavl\b', r'\bbal\b', r'\bbalance\b', r'\bon\b', 
            r'\bvia\b', r'\bfrom\b', r'\blink\b', r'\burl\b', r'\bwith\b', 
            r'\bfor\b', r'\bdt\b', r'\bdate\b', r'\bupi\b', r'\bac\b', r'\baccount\b'
        ]
        
        cleaned_merchant = raw_merchant
        for kw in fluff_keywords:
            split_parts = re.split(kw, cleaned_merchant, flags=re.IGNORECASE)
            if len(split_parts) > 0:
                cleaned_merchant = split_parts[0].strip()
                
        # Strip trailing punctuation or spaces
        cleaned_merchant = re.sub(r'[\s\-\.,]+$', '', cleaned_merchant).strip()
        if cleaned_merchant:
            merchant = cleaned_merchant
            print(f"[DEBUG] Extracted merchant after anchors: \"{merchant}\"", file=sys.stderr)
            
    # Default fallback for UI resilience
    if not merchant:
        merchant = 'Unknown Merchant'
        print(f"[DEBUG] Merchant extraction failed: Defaulting to \"Unknown Merchant\"", file=sys.stderr)
        
    # Auto-assign category
    category = auto_categorize(merchant if merchant != 'Unknown Merchant' else message_clean)
    if not category:
        category = "Miscellaneous"
        
    # Create unique transaction ID using message, sender, amount, and a high-precision nanosecond timestamp
    # to prevent collisions for identical duplicate transactions on the same day.
    import time
    timestamp_salt = str(time.time_ns())
    tx_hash = hashlib.md5(f"SMS-{sender}-{message_clean[:30]}-{amount}-{timestamp_salt}".encode()).hexdigest()[:12].upper()
    tx_id = f"SMS-{tx_hash}"
    
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    print(f"[DEBUG] Parse success: ID={tx_id}, Amount={signed_amount}, Merchant=\"{merchant}\", Category=\"{category}\"", file=sys.stderr)
    
    return {
        "transaction_id": tx_id,
        "amount": signed_amount,
        "date": date_str,
        "description": f"SMS from {sender.strip().upper()}: {message_clean}",
        "category": category,
        "visibility": "Private",
        "currency": currency,
        "bank": sender.strip().upper(),
        "merchant": merchant
    }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python sms_parser.py <sender> <message>"}))
        sys.exit(1)
        
    sender = sys.argv[1]
    message = sys.argv[2]
    
    result = parse_sms(sender, message)
    print(json.dumps(result))
