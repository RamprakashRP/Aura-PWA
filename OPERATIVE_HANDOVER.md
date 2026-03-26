# 🤖 Operative Handover: Aura Finance PWA 🌌

**Context for the Partner Agent (Antigravity)**

### 1. Core Architecture
-   **Security**: Role-Based Access Control (RLS) is active. All DB queries in `Dashboard.tsx`, `Transactions.tsx`, and `Upload.tsx` **MUST** be filtered by `user.id` (AuthContext).
-   **Modular Parser**: `aura/.agents/skills/statement-parser/parser.py` is a **Dynamic Dispatcher**. 
    -   It uses heuristic signature scanning (`detect_bank`) to identify bank types (Kotak, HDFC, Jio, etc.).
    -   **Zero-Conflict Strategy**: DO NOT edit `parser.py` or `Upload.tsx` for bank-specific logic. Instead, create/edit files in the `banks/` subdirectory.

### 2. Working on New Banks
-   If adding support for HDFC, Union, etc., work strictly inside `aura/.agents/skills/statement-parser/banks/<bank_name>.py`.
-   **Protocol**: Your file must have a `def parse(pdf_path)` function that returns a list of transaction dictionaries with `transaction_id`, `date`, `amount`, `withdrawal`, `deposit`, `raw_description`, and `balance`.
-   **Aura Signature**: All new transactions default to `visibility: 'Private'` in the parser logic.

### 3. Git Merge Strategy
-   The main application UI (`Upload.tsx`) has a Hybrid Selector that automatically sees any bank added to the `banks/` folder.
-   By working inside isolated bank files, we prevent Merge Conflicts in the core engine.

---
**Current Mission**: Implement `HDFC` logic in `banks/hdfc.py` while respecting the `user_id` data isolation.
