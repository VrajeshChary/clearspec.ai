import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "statutory_rules.db"

SEED_RULES = [
    # Spices (0904 - Chilli & Pepper, 0910 - Ginger, Turmeric)
    ("41814-78-2", "Tricyclazole", "EU", "0904", "Dried Red Chilli / Pepper", 0.01, "Regulation (EC) 396/2005 & Reg (EU) 2017/626"),
    ("41814-78-2", "Tricyclazole", "EU", "1006", "Basmati Rice", 0.01, "Regulation (EU) 2017/626"),
    ("2921-88-2", "Chlorpyrifos", "EU", "0904", "Dried Red Chilli / Spices", 0.01, "Regulation (EU) 2020/1085 (Banned in EU - Default LOQ)"),
    ("2921-88-2", "Chlorpyrifos", "EU", "0806", "Grapes, fresh or dried", 0.01, "Regulation (EU) 2020/1085"),
    ("2921-88-2", "Chlorpyrifos", "EU", "1006", "Rice", 0.01, "Regulation (EU) 2020/1085"),
    ("2921-88-2", "Chlorpyrifos", "EU", "0902", "Tea", 0.01, "Regulation (EU) 2020/1085"),
    ("2921-88-2", "Chlorpyrifos", "EU", "1202", "Ground-nuts / Peanuts", 0.01, "Regulation (EU) 2020/1085"),
    ("75-21-8", "Ethylene oxide", "EU", "0904", "Spices - Chilli & Pepper", 0.02, "Regulation (EU) 2020/1540 & Reg (EU) 2022/1396"),
    ("75-21-8", "Ethylene oxide", "EU", "0910", "Ginger, Turmeric, Curry Spices", 0.02, "Regulation (EU) 2020/1540"),
    ("75-21-8", "Ethylene oxide", "EU", "0902", "Tea", 0.02, "Regulation (EU) 2020/1540"),
    ("75-21-8", "Ethylene oxide", "EU", "1006", "Rice", 0.01, "Regulation (EU) 2020/1540"),
    ("75-21-8", "Ethylene oxide", "EU", "1202", "Ground-nuts", 0.02, "Regulation (EU) 2020/1540"),
    ("1162-65-8", "Aflatoxin B1", "EU", "0904", "Dried Chilli & Pepper Spices", 0.005, "Regulation (EU) 2023/915 (Max 5.0 ug/kg)"),
    ("1162-65-8", "Aflatoxin B1", "EU", "0910", "Spices - Turmeric, Ginger", 0.005, "Regulation (EU) 2023/915 (Max 5.0 ug/kg)"),
    ("1162-65-8", "Aflatoxin B1", "EU", "1202", "Peanuts / Groundnuts for direct consumption", 0.002, "Regulation (EU) 2023/915 (Max 2.0 ug/kg)"),
    ("1162-65-8", "Aflatoxin B1", "EU", "1006", "Cereals and Rice", 0.002, "Regulation (EU) 2023/915 (Max 2.0 ug/kg)"),
    ("135410-20-7", "Acetamiprid", "EU", "0904", "Dried Chilli", 0.50, "Regulation (EU) 2023/1029"),
    ("135410-20-7", "Acetamiprid", "EU", "0806", "Grapes", 0.01, "Regulation (EU) 2023/1029"),
    ("135410-20-7", "Acetamiprid", "EU", "0902", "Tea", 0.05, "Regulation (EU) 2023/1029"),
    ("138261-41-3", "Imidacloprid", "EU", "0904", "Dried Chilli / Pepper", 0.01, "Regulation (EU) 2024/331"),
    ("138261-41-3", "Imidacloprid", "EU", "1006", "Rice", 0.01, "Regulation (EU) 2024/331"),
    ("138261-41-3", "Imidacloprid", "EU", "0902", "Tea", 0.05, "Regulation (EU) 2024/331"),
    ("41198-08-7", "Profenofos", "EU", "0904", "Dried Chilli", 0.05, "Regulation (EU) 2021/618"),
    ("41198-08-7", "Profenofos", "EU", "0910", "Spices", 0.05, "Regulation (EU) 2021/618"),
    ("10605-21-7", "Carbendazim", "EU", "0904", "Spices", 0.10, "Regulation (EU) 2021/1110"),
    ("10605-21-7", "Carbendazim", "EU", "1006", "Rice", 0.01, "Regulation (EU) 2021/1110"),
    ("153719-23-4", "Thiamethoxam", "EU", "0904", "Dried Chilli", 0.01, "Regulation (EU) 2023/334"),
    ("153719-23-4", "Thiamethoxam", "EU", "1006", "Basmati Rice", 0.01, "Regulation (EU) 2023/334"),
    ("210880-92-5", "Clothianidin", "EU", "0904", "Spices", 0.01, "Regulation (EU) 2023/334"),
    ("52315-07-8", "Cypermethrin", "EU", "0904", "Dried Chilli", 0.50, "Regulation (EC) 396/2005"),
    ("52918-63-5", "Deltamethrin", "EU", "0904", "Spices", 0.20, "Regulation (EC) 396/2005"),
    ("120068-37-3", "Fipronil", "EU", "0904", "Spices", 0.005, "Regulation (EU) 2020/220"),
    ("120068-37-3", "Fipronil", "EU", "0306", "Crustaceans / Frozen Shrimp", 0.005, "Regulation (EU) 2020/220"),
    ("56-75-7", "Chloramphenicol", "EU", "0306", "Aquaculture / Shrimp", 0.00015, "Regulation (EU) 2019/1871 (MRPL 0.15 ug/kg)"),
    ("79-57-2", "Oxytetracycline", "EU", "0306", "Finfish / Shrimp", 0.10, "Regulation (EU) 37/2010"),
    ("303-47-9", "Ochratoxin A", "EU", "0904", "Spices - Capsicum spp.", 0.015, "Regulation (EU) 2023/915 (Max 15 ug/kg)"),
    ("7439-92-1", "Lead (Pb)", "EU", "0904", "Spices - Fruit of Piper/Capsicum", 1.50, "Regulation (EU) 2023/915"),
    ("7440-43-9", "Cadmium (Cd)", "EU", "0904", "Spices - Chilli & Pepper", 1.00, "Regulation (EU) 2023/915"),
    ("7440-38-2", "Inorganic Arsenic", "EU", "1006", "Non-parboiled milled rice (white rice)", 0.20, "Regulation (EU) 2023/915"),
    # US FDA Rules
    ("2921-88-2", "Chlorpyrifos", "US_FDA", "0904", "Spices", 0.01, "US FDA 40 CFR 180 (Zero Tolerance Revocation)"),
    ("1162-65-8", "Aflatoxins (Total)", "US_FDA", "0904", "Food & Spices", 0.020, "US FDA Compliance Policy Guide Sec. 555.400 (20 ppb)"),
]

SEED_ALIASES = [
    ("41814-78-2", "tricyclazole"),
    ("41814-78-2", "beam"),
    ("41814-78-2", "tricyclazol"),
    ("2921-88-2", "chlorpyrifos"),
    ("2921-88-2", "chlorpyriphos"),
    ("2921-88-2", "dursban"),
    ("2921-88-2", "chlorpyrifos-ethyl"),
    ("75-21-8", "ethylene oxide"),
    ("75-21-8", "eto"),
    ("75-21-8", "oxirane"),
    ("75-21-8", "2-chloroethanol"),
    ("1162-65-8", "aflatoxin b1"),
    ("1162-65-8", "aflatoxin"),
    ("1162-65-8", "afb1"),
    ("135410-20-7", "acetamiprid"),
    ("135410-20-7", "mospilan"),
    ("135410-20-7", "assail"),
    ("138261-41-3", "imidacloprid"),
    ("138261-41-3", "confidor"),
    ("138261-41-3", "gaucho"),
    ("41198-08-7", "profenofos"),
    ("41198-08-7", "curacron"),
    ("10605-21-7", "carbendazim"),
    ("10605-21-7", "bavistin"),
    ("153719-23-4", "thiamethoxam"),
    ("210880-92-5", "clothianidin"),
    ("52315-07-8", "cypermethrin"),
    ("52918-63-5", "deltamethrin"),
    ("120068-37-3", "fipronil"),
    ("56-75-7", "chloramphenicol"),
    ("79-57-2", "oxytetracycline"),
    ("303-47-9", "ochratoxin a"),
    ("303-47-9", "ota"),
    ("7439-92-1", "lead"),
    ("7440-43-9", "cadmium"),
    ("7440-38-2", "arsenic"),
]

def init_statutory_database():
    """Initializes and seeds the real SQLite statutory database."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS mrl_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cas_number TEXT NOT NULL,
        canonical_name TEXT NOT NULL,
        market TEXT DEFAULT 'EU',
        hs4_prefix TEXT NOT NULL,
        commodity_desc TEXT NOT NULL,
        max_limit_mg_kg REAL NOT NULL,
        regulation_reference TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chemical_aliases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cas_number TEXT NOT NULL,
        alias TEXT NOT NULL
    )
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_mrl_cas_hs ON mrl_rules(cas_number, hs4_prefix);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_aliases_alias ON chemical_aliases(alias);")

    # Check if empty, seed if so
    cursor.execute("SELECT COUNT(*) FROM mrl_rules")
    count = cursor.fetchone()[0]
    if count < len(SEED_RULES):
        cursor.execute("DELETE FROM mrl_rules")
        cursor.execute("DELETE FROM chemical_aliases")
        cursor.executemany("""
        INSERT INTO mrl_rules (cas_number, canonical_name, market, hs4_prefix, commodity_desc, max_limit_mg_kg, regulation_reference)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, SEED_RULES)

        cursor.executemany("""
        INSERT INTO chemical_aliases (cas_number, alias)
        VALUES (?, ?)
        """, [(c, a.lower().strip()) for c, a in SEED_ALIASES])
        conn.commit()

    conn.close()

# Initialize on import
init_statutory_database()
