import pdfplumber
import re
import traceback

""" 
Jio Payments Bank Parser Module
"""

def categorize(desc):
    # Reusing the universal categorization logic from kotak
    try:
        from .kotak import categorize as universal_categorize
        return universal_categorize(desc)
    except:
        return "Miscellaneous"

def parse(pdf_path):
    extracted_data = []
    try:
        # Regex for Jio: Date ValueDesc Withdrawal Deposit Balance
        # Example: 18-Feb-2026 18-Feb-2026 UPI/CR/604984115843/RAMPRAKASHR/KKB 0.00 4,103.00 4,159.66
        # Note: Narration can contain spaces, but usually Withdrawal/Deposit are numbers at the end.
        jio_row_pattern = re.compile(r'^(\d{2}-[a-zA-Z]{3}-\d{4})\s+(\d{2}-[a-zA-Z]{3}-\d{4})\s+(.*?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})')

        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue
                
                lines = text.split('\n')
                for line in lines:
                    line = line.strip()
                    match = jio_row_pattern.match(line)
                    if match:
                        raw_date, val_date, narration, w_amt, d_amt, bal = match.groups()
                        
                        # Extract UPI Ref if present
                        ref_id = ""
                        # UPI format in Jio: UPI/CR/ID/NAME/BANK
                        if "UPI/" in narration:
                            parts = narration.split('/')
                            if len(parts) > 2:
                                ref_id = f"JIO-{parts[2]}" # Use the 12-digit UPI ref
                        
                        if not ref_id:
                            # Fallback ID: Hash-like string from date and narration
                            import hashlib
                            ref_id = f"JIO-{hashlib.md5((raw_date + narration + w_amt + d_amt).encode()).hexdigest()[:12].upper()}"

                        # Map to Aura Category
                        cat = categorize(narration)

                        # Clean amounts
                        w_val = float(w_amt.replace(',', ''))
                        d_val = float(d_amt.replace(',', ''))
                        amount = d_val if d_val > 0 else -w_val

                        # Identify Merchant / Reason from UPI string
                        merchant = narration
                        reason = "General"
                        if "UPI/" in narration:
                            parts = narration.split('/')
                            if len(parts) > 3:
                                merchant = parts[3]
                                reason = parts[-1] if len(parts) > 4 else "UPI"

                        extracted_data.append({
                            "transaction_id": ref_id,
                            "date": raw_date,
                            "raw_description": narration,
                            "merchant": merchant,
                            "reason": reason,
                            "category": cat,
                            "amount": amount,
                            "withdrawal": w_amt if w_val > 0 else "0",
                            "deposit": d_amt if d_val > 0 else "0",
                            "balance": bal,
                            "currency": "INR",
                            "visibility": "Private"
                        })
    except Exception as e:
        # We return the data we got so far, or log the error
        print(f"Jio Parser Error: {str(e)}")
        
    return extracted_data
