import pdfplumber
import json
import os

def debug_pdf_to_json(pdf_path, output_json):
    if not os.path.exists(pdf_path):
        return {"error": "File not found"}
        
    results = {"pages": []}
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_data = {
                    "text": page.extract_text(),
                    "tables": page.extract_tables()
                }
                results["pages"].append(page_data)
                
        with open(output_json, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    debug_pdf_to_json(r"C:\Users\rampr\OneDrive\Desktop\Projects\Aura-PWA\Jio Account Statement Sample.pdf", r"c:\Users\rampr\OneDrive\Desktop\Projects\Aura-PWA\tmp\jio_debug.json")
