import os
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_packets" / "packet_a_rotterdam"
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

class StampedCanvas(canvas.Canvas):
    """Custom canvas that draws a semi-transparent blue stamp over the chlorpyrifos row."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.stamp_needed = False

    def showPage(self):
        if self.stamp_needed:
            self.saveState()
            # Draw semi-transparent blue ink inspection stamp
            self.setFillColor(colors.HexColor("#0284c7"), alpha=0.35)
            self.setStrokeColor(colors.HexColor("#0369a1"), alpha=0.6)
            self.setLineWidth(2)
            # Position directly overlapping Chlorpyrifos (0.008 mg/kg) row in table
            self.circle(355, 512, 38, fill=1, stroke=1)
            self.circle(355, 512, 32, fill=0, stroke=1)
            self.setFillColor(colors.HexColor("#0369a1"), alpha=0.7)
            self.setFont("Helvetica-Bold", 8)
            self.drawCentredString(355, 520, "NABL / EIC")
            self.setFont("Helvetica-Bold", 7)
            self.drawCentredString(355, 510, "PASSED QA")
            self.setFont("Helvetica", 6)
            self.drawCentredString(355, 500, "LAB-INSP-2026")
            self.restoreState()
        super().showPage()

def create_commercial_invoice():
    pdf_path = SAMPLE_DIR / "Commercial_Invoice_104.pdf"
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        alignment=1,
    )
    bold_label = ParagraphStyle("BoldLabel", parent=styles["Normal"], fontSize=9, leading=12, fontName="Helvetica-Bold")
    normal_text = ParagraphStyle("NormText", parent=styles["Normal"], fontSize=9, leading=12)
    small_text = ParagraphStyle("SmallText", parent=styles["Normal"], fontSize=8, leading=10, textColor=colors.HexColor("#475569"))

    story = [
        Paragraph("COMMERCIAL INVOICE", title_style),
        Paragraph("Invoice No: <b>EXP/2026/GNT-104</b> &nbsp;&nbsp;|&nbsp;&nbsp; Date: <b>15-OCT-2026</b>", ParagraphStyle("sub", parent=normal_text, alignment=1)),
        Spacer(1, 14),
        HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#cbd5e1"), spaceAfter=12),
    ]

    party_data = [
        [
            Paragraph("<b>EXPORTER / SHIPPER:</b><br/>KRISHNA SPICES & AGRO EXPORTS LTD.<br/>Plot 44-B, Spice Park, Edlapadu Mandal<br/>Guntur, Andhra Pradesh - 522233, INDIA<br/>GSTIN: 37AAACK1234F1Z8 | IEC: 0394019284", normal_text),
            Paragraph("<b>CONSIGNEE / IMPORTER:</b><br/>ROTTERDAM EURO-SPICE LOGISTICS B.V.<br/>Haven 4200, Maasvlakte Havenweg 82<br/>3088 GN Rotterdam, NETHERLANDS<br/>VAT ID: NL882910394B01 | EORI: NL882910394", normal_text),
        ],
        [
            Paragraph("<b>PORT OF LOADING:</b> Chennai Sea (INMAA1)<br/><b>VESSEL / VOYAGE:</b> MSC GULSUN / 2604W<br/><b>FINAL DESTINATION:</b> Port of Rotterdam, Netherlands", normal_text),
            Paragraph("<b>TERMS OF DELIVERY:</b> CIF Rotterdam (Incoterms 2020)<br/><b>PAYMENT TERMS:</b> Irrevocable Confirmed L/C at Sight<br/><b>COUNTRY OF ORIGIN:</b> India", normal_text),
        ]
    ]
    party_table = Table(party_data, colWidths=[270, 270])
    party_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(party_table)
    story.append(Spacer(1, 14))

    items_data = [
        [
            Paragraph("<b>Item / Description</b>", bold_label),
            Paragraph("<b>HS Code</b>", bold_label),
            Paragraph("<b>Batch No.</b>", bold_label),
            Paragraph("<b>Net Wt (kg)</b>", bold_label),
            Paragraph("<b>Rate (€/kg)</b>", bold_label),
            Paragraph("<b>Amount (€)</b>", bold_label),
        ],
        [
            Paragraph("Indian Dried Red Crushed Chili Flakes<br/>(Capsicum annuum, Stemless - Premium Grade)", normal_text),
            Paragraph("<b>09042211</b>", normal_text),
            Paragraph("<b>GNT-24A</b>", normal_text),
            Paragraph("<b>18,500.00</b>", normal_text),
            Paragraph("€4.00", normal_text),
            Paragraph("€74,000.00", normal_text),
        ],
    ]
    items_table = Table(items_data, colWidths=[180, 75, 75, 80, 60, 70])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white]),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 10))

    summary_data = [
        ["Total Number of Packages:", "740 Bags @ 25 kg net in multiwall kraft paper"],
        ["Gross Weight:", "19,200.00 kg"],
        ["Declared Net Weight:", "18,500.00 kg"],
        ["Total Invoice Value CIF Rotterdam:", "€74,000.00 (EUR Seventy-Four Thousand Only)"],
        ["Approximate Value in INR:", "₹66,60,000.00 (Ex. Rate 1 EUR = ₹90.00)"],
    ]
    sum_table = Table(summary_data, colWidths=[200, 340])
    sum_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor("#0f172a")),
    ]))
    story.append(sum_table)
    story.append(Spacer(1, 15))
    story.append(Paragraph("Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Goods meet Spices Board of India export specifications.", small_text))
    
    doc.build(story)
    print(f"Generated: {pdf_path}")

def create_packing_list():
    pdf_path = SAMPLE_DIR / "Packing_List_104.pdf"
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        alignment=1,
    )
    bold_label = ParagraphStyle("BoldLabel", parent=styles["Normal"], fontSize=9, leading=12, fontName="Helvetica-Bold")
    normal_text = ParagraphStyle("NormText", parent=styles["Normal"], fontSize=9, leading=12)
    small_text = ParagraphStyle("SmallText", parent=styles["Normal"], fontSize=8, leading=10, textColor=colors.HexColor("#475569"))

    story = [
        Paragraph("PACKING LIST", title_style),
        Paragraph("Ref: <b>PL/2026/GNT-104</b> &nbsp;&nbsp;|&nbsp;&nbsp; Invoice Link: <b>EXP/2026/GNT-104</b> &nbsp;&nbsp;|&nbsp;&nbsp; Date: <b>16-OCT-2026</b>", ParagraphStyle("sub", parent=normal_text, alignment=1)),
        Spacer(1, 14),
        HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#cbd5e1"), spaceAfter=12),
    ]

    header_data = [
        [
            Paragraph("<b>SHIPPER:</b> KRISHNA SPICES & AGRO EXPORTS LTD.<br/>Guntur, Andhra Pradesh, INDIA", normal_text),
            Paragraph("<b>CONSIGNEE:</b> ROTTERDAM EURO-SPICE LOGISTICS B.V.<br/>Maasvlakte Havenweg 82, Rotterdam", normal_text),
        ],
        [
            Paragraph("<b>CONTAINER NO:</b> MSKU-9182301 / 40' FCL<br/><b>SEAL NO:</b> EIC-IND-881920", normal_text),
            Paragraph("<b>PORT OF DISCHARGE:</b> Rotterdam, Netherlands<br/><b>COMMODITY:</b> Dried Crushed Chili Flakes", normal_text),
        ]
    ]
    h_table = Table(header_data, colWidths=[270, 270])
    h_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(h_table)
    story.append(Spacer(1, 14))

    table_data = [
        [
            Paragraph("<b>Package Nos.</b>", bold_label),
            Paragraph("<b>Description of Goods</b>", bold_label),
            Paragraph("<b>HS Code</b>", bold_label),
            Paragraph("<b>Batch</b>", bold_label),
            Paragraph("<b>Gross Wt (kg)</b>", bold_label),
            Paragraph("<b>Net Wt (kg)</b>", bold_label),
        ],
        [
            Paragraph("Bags 001 - 360", normal_text),
            Paragraph("Crushed Chili Flakes (Pallet 1-10)", normal_text),
            Paragraph("09042211", normal_text),
            Paragraph("GNT-24A", normal_text),
            Paragraph("9,150.00", normal_text),
            Paragraph("8,800.00", normal_text),
        ],
        [
            Paragraph("Bags 361 - 722", normal_text),
            Paragraph("Crushed Chili Flakes (Pallet 11-20)", normal_text),
            Paragraph("09042211", normal_text),
            Paragraph("GNT-24A", normal_text),
            Paragraph("9,600.00", normal_text),
            Paragraph("9,250.00", normal_text),
        ],
        [
            Paragraph("<b>TOTALS</b>", bold_label),
            Paragraph("<b>722 Multiwall Bags Loaded</b>", bold_label),
            Paragraph("<b>09042211</b>", bold_label),
            Paragraph("<b>GNT-24A</b>", bold_label),
            Paragraph("<b>18,750.00 kg</b>", bold_label),
            Paragraph("<b>18,050.00 kg</b>", bold_label),  # Deliberate 450 kg discrepancy vs 18,500 kg
        ]
    ]
    t = Table(table_data, colWidths=[90, 160, 75, 65, 75, 75])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white]),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#fee2e2")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 14))

    notes = [
        ["Total Packages Loaded:", "722 Bags (Short-shipped 18 bags from planned 740)"],
        ["Total Net Weight:", "18,050.00 kg"],
        ["Total Gross Weight:", "18,750.00 kg"],
        ["Tare Weight of Bags/Pallets:", "700.00 kg"],
    ]
    n_table = Table(notes, colWidths=[180, 360])
    n_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(n_table)
    story.append(Spacer(1, 15))
    story.append(Paragraph("Certified that the contents of this packing list are accurate according to container weighbridge measurement slip WB/GNT/9821.", small_text))

    doc.build(story)
    print(f"Generated: {pdf_path}")

def create_lab_report():
    pdf_path = SAMPLE_DIR / "NABL_Lab_Report_104.pdf"
    
    # We will build with custom canvas that draws stamp
    def make_canvas(*args, **kwargs):
        c = StampedCanvas(*args, **kwargs)
        c.stamp_needed = True
        return c

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#1e293b"),
        alignment=1,
    )
    bold_label = ParagraphStyle("BoldLabel", parent=styles["Normal"], fontSize=8.5, leading=11, fontName="Helvetica-Bold")
    normal_text = ParagraphStyle("NormText", parent=styles["Normal"], fontSize=8.5, leading=11)
    small_text = ParagraphStyle("SmallText", parent=styles["Normal"], fontSize=7.5, leading=10, textColor=colors.HexColor("#64748b"))

    story = [
        Paragraph("AGRI-TEST ANALYTICAL LABORATORIES INDIA PVT. LTD.", title_style),
        Paragraph("NABL Accredited Testing Laboratory (ISO/IEC 17025:2017) | Certificate No: TC-8492<br/>Approved by Spices Board of India & Export Inspection Council (EIC)", ParagraphStyle("sub", parent=normal_text, alignment=1, fontSize=8, textColor=colors.HexColor("#475569"))),
        Spacer(1, 10),
        HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=10),
        Paragraph("<b>CERTIFICATE OF ANALYSIS (EXPORT GRADE RESIDUE PROFILE)</b>", ParagraphStyle("sub2", parent=normal_text, alignment=1, fontSize=10, fontName="Helvetica-Bold", textColor=colors.HexColor("#0369a1"))),
        Spacer(1, 8),
    ]

    meta_data = [
        [
            Paragraph("<b>Report ID:</b> NABL/GNT/2026/104-R", normal_text),
            Paragraph("<b>Sample Drawn Date:</b> 12-OCT-2026", normal_text),
            Paragraph("<b>Test Complete Date:</b> 15-OCT-2026", normal_text),
        ],
        [
            Paragraph("<b>Customer Name:</b> Krishna Spices Ltd.", normal_text),
            Paragraph("<b>Sample Name:</b> Red Chili Flakes", normal_text),
            Paragraph("<b>Batch / Lot No:</b> <b>GNT-24A</b>", normal_text),
        ],
        [
            Paragraph("<b>Declared HS Code:</b> 09042211", normal_text),
            Paragraph("<b>Sampling Standard:</b> ISO 948 / EIC", normal_text),
            Paragraph("<b>Consignment Weight:</b> 18,500 kg", normal_text),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[180, 180, 180])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    analytes_data = [
        [
            Paragraph("<b>Parameter / Chemical Residue</b>", bold_label),
            Paragraph("<b>CAS No.</b>", bold_label),
            Paragraph("<b>Test Method</b>", bold_label),
            Paragraph("<b>Reported Result</b>", bold_label),
            Paragraph("<b>Lab LOQ</b>", bold_label),
            Paragraph("<b>EU Statutory MRL</b>", bold_label),
        ],
        [
            Paragraph("<b>Tricyclazole</b><br/><font color='#64748b' size=7>Fungicide residue</font>", normal_text),
            Paragraph("41814-78-2", normal_text),
            Paragraph("LC-MS/MS", normal_text),
            Paragraph("<b>BLQ</b><br/><font color='#d97706' size=7>(Below LOQ)</font>", normal_text),
            Paragraph("<b>0.05 mg/kg</b>", normal_text),
            Paragraph("<b>0.01 mg/kg</b><br/><font color='#ef4444' size=7>Strict EU MRL</font>", normal_text),
        ],
        [
            Paragraph("<b>Aflatoxin B1</b><br/><font color='#64748b' size=7>Mycotoxin contaminant</font>", normal_text),
            Paragraph("1162-65-8", normal_text),
            Paragraph("HPLC-FLD", normal_text),
            Paragraph("<b>8.5 µg/kg</b><br/><font color='#ef4444' size=7>(0.0085 mg/kg)</font>", normal_text),
            Paragraph("1.0 µg/kg", normal_text),
            Paragraph("<b>5.0 µg/kg</b><br/><font color='#ef4444' size=7>Reg (EU) 2023/915</font>", normal_text),
        ],
        [
            Paragraph("<b>Chlorpyrifos</b><br/><font color='#64748b' size=7>Organophosphate pesticide</font>", normal_text),
            Paragraph("2921-88-2", normal_text),
            Paragraph("GC-MS/MS", normal_text),
            Paragraph("<b>0.008 mg/kg</b>", normal_text),
            Paragraph("0.005 mg/kg", normal_text),
            Paragraph("0.01 mg/kg", normal_text),
        ],
        [
            Paragraph("Ethylene Oxide (EtO)", normal_text),
            Paragraph("75-21-8", normal_text),
            Paragraph("GC-MS/MS", normal_text),
            Paragraph("BLQ", normal_text),
            Paragraph("0.01 mg/kg", normal_text),
            Paragraph("0.02 mg/kg", normal_text),
        ],
    ]

    t_analytes = Table(analytes_data, colWidths=[140, 75, 75, 85, 80, 85])
    t_analytes.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0369a1")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_analytes)
    story.append(Spacer(1, 14))

    notes = [
        Paragraph("<b>ANALYTICAL REMARKS & COMPLIANCE NOTES:</b>", bold_label),
        Paragraph("1. Tricyclazole reported as BLQ based on laboratory validated LOQ of 0.05 mg/kg for spice matrix.", small_text),
        Paragraph("2. Aflatoxin B1 was tested in accordance with Commission Regulation (EU) 2023/915. Result: 8.5 µg/kg.", small_text),
        Paragraph("3. Chlorpyrifos quantified at 0.008 mg/kg via multi-residue GC-MS/MS method (Notice: QA inspection stamp applied across column).", small_text),
        Paragraph("4. The results relate only to the items tested as received at Guntur Analytical Center.", small_text),
    ]
    for n in notes:
        story.append(n)
        story.append(Spacer(1, 3))

    story.append(Spacer(1, 10))
    sig_data = [
        [
            Paragraph("Analyzed By:<br/><b>Dr. R. Ramanathan, M.Sc., Ph.D.</b><br/>Senior Residue Chemist", small_text),
            Paragraph("Authorized Signatory:<br/><b>Dr. K. S. Rao</b><br/>Technical Director & Quality Manager", small_text),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[270, 270])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEABOVE', (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(sig_table)

    doc.build(story, canvasmaker=make_canvas)
    print(f"Generated: {pdf_path}")

def generate_all():
    create_commercial_invoice()
    create_packing_list()
    create_lab_report()

if __name__ == "__main__":
    generate_all()
