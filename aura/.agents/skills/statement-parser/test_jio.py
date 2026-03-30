import json
from banks.jio import parse
import sys

pdf_path = r"C:\Users\rampr\OneDrive\Desktop\Projects\Aura-PWA\Jio Account Statement Sample.pdf"
try:
    data = parse(pdf_path)
    print(json.dumps(data[:3], indent=2))
    print(f"\nTotal transactions extracted: {len(data)}")
except Exception as e:
    print(f"Test Error: {str(e)}")
