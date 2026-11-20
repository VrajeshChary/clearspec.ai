"""Sample PDF router – serves raw PDFs and high-res page-rendered PNGs for the Visual Inspector."""
import io
from pathlib import Path

import pymupdf as fitz
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, Response

router = APIRouter(prefix="/sample-pdf", tags=["Sample PDFs"])

SAMPLE_DIR = (
    Path(__file__).resolve().parent.parent.parent
    / "sample_packets"
    / "packet_a_rotterdam"
)


def _get_pdf_path(filename: str) -> Path:
    """Resolve and validate the requested PDF path."""
    # Sanitise – no path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = SAMPLE_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")
    return path


@router.get("/{filename}", response_class=FileResponse)
async def get_sample_pdf(filename: str):
    """Return a sample PDF file from the Rotterdam packet.

    Parameters
    ----------
    filename : str
        Name of the PDF file, e.g. ``Commercial_Invoice_104.pdf``.
    """
    path = _get_pdf_path(filename)
    return FileResponse(path=path, media_type="application/pdf")


@router.get("/{filename}/page/{page_num}.png")
async def get_pdf_page_png(filename: str, page_num: int = 0):
    """Render a single PDF page as a crisp 2× DPI PNG for the Visual Inspector.

    Parameters
    ----------
    filename : str
        PDF filename inside the Rotterdam packet directory.
    page_num : int
        0-based page index.

    Returns
    -------
    image/png
        The rasterised page at 2× scale (≈144 DPI effective resolution).
    """
    path = _get_pdf_path(filename)

    try:
        doc = fitz.open(str(path))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not open PDF: {exc}")

    if page_num < 0 or page_num >= len(doc):
        raise HTTPException(
            status_code=404,
            detail=f"Page {page_num} not found — document has {len(doc)} page(s)",
        )

    page = doc[page_num]
    # 2× scale matrix → ~144 DPI → crisp text without massive file size
    matrix = fitz.Matrix(2, 2)
    pixmap = page.get_pixmap(matrix=matrix, alpha=False)
    png_bytes = pixmap.tobytes("png")
    doc.close()

    return Response(content=png_bytes, media_type="image/png")
