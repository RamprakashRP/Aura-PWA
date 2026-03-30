import sys
import json
import traceback
import importlib

def detect_bank(pdf_path):
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            # Join text from first page and remove spaces to make it robust
            raw_text = pdf.pages[0].extract_text() if pdf.pages else ""
            clean_text = raw_text.upper().replace(" ", "").replace("\n", "")
            
            # 1. Primary High-Fidelity Signatures (Official Names)
            if "KOTAKMAHINDRA" in clean_text: return "kotak"
            if "JIOPAYMENTS" in clean_text: return "jio"
            if "HDFCBANK" in clean_text: return "hdfc"
            if "UNIONBANK" in clean_text: return "union"
            
            # 2. Secondary High-Fidelity (IFSC Codes / Unique IDs)
            if "KKBK" in clean_text: return "kotak" # Kotak IFSC code
            if "JIOP00" in clean_text: return "jio" # Jio IFSC prefix
            
            # 3. Final Fallbacks (Only if no primary match found)
            if "KOTAK" in clean_text: return "kotak"
            if "JIO" in clean_text and not "KOTAK" in clean_text: return "jio"
            return None
    except:
        return None

def run_parser(bank_type, pdf_path):
    try:
        # Help Python find the banks module in the current directory if needed
        import os
        current_dir = os.path.dirname(os.path.abspath(__file__))
        if current_dir not in sys.path:
            sys.path.append(current_dir)
        # Auto-detect if bank_type is missing or generic
        if not bank_type or bank_type.lower() == "auto":
            detected = detect_bank(pdf_path)
            if detected:
                bank_type = detected
            else:
                # Default fallback if detection fails
                bank_type = "kotak" 

        # Dynamic import based on bank type
        module_path = f"banks.{bank_type.lower()}"
        try:
            bank_module = importlib.import_module(module_path)
        except ImportError:
            return {"error": f"Bank module '{bank_type}' not found in the matrix. Map it in banks/{bank_type.lower()}.py"}

        # Call the standard parse() function in that module
        if hasattr(bank_module, 'parse'):
            data = bank_module.parse(pdf_path)
            
            # Post-process for global deduplication
            if isinstance(data, list):
                unique_data = []
                seen_tx_ids = {}
                for item in data:
                    tx_id = item["transaction_id"]
                    if tx_id in seen_tx_ids:
                        seen_tx_ids[tx_id] += 1
                        item["transaction_id"] = f"{tx_id}-{seen_tx_ids[tx_id]}"
                    else:
                        seen_tx_ids[tx_id] = 0
                    unique_data.append(item)
                # Return object with bank metadata
                return {"bank": bank_type, "transactions": unique_data}
            return data
        else:
            return {"error": f"Bank module '{bank_type}' lacks a valid parse() protocol."}

    except Exception as e:
        return {"error": f"Universal Dispatcher Failure: {str(e)}\n{traceback.format_exc()}"}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        # Backward compatibility for old calls if needed, but we expect: python parser.py Kotak path/to/file.pdf
        if len(sys.argv) == 2:
            # Default to Kotak if only path provided
            data = run_parser("kotak", sys.argv[1])
        else:
            print(json.dumps({"error": "Usage: python parser.py <bank_type> <file_path>"}))
            sys.exit(1)
    else:
        bank_type = sys.argv[1]
        file_path = sys.argv[2]
        data = run_parser(bank_type, file_path)
        
    print(json.dumps(data))
