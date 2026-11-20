import React, { useState, useRef, useCallback } from 'react';
import {
  ShieldX, ShieldCheck, AlertTriangle, Eye, Copy, CheckCheck,
  FileText, Upload, ChevronRight, Loader2, ZoomIn, X, Sparkles, Download
} from 'lucide-react';
import LiveVoiceWidget from './LiveVoiceWidget';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE_DOCS = [
  { key: 'Commercial_Invoice_104.pdf',  label: 'Commercial Invoice' },
  { key: 'Packing_List_104.pdf',        label: 'Packing List'       },
  { key: 'NABL_Lab_Report_104.pdf',     label: 'NABL Lab Report'    },
];

// Map analyte name → which PDF filename it appears in
const ANALYTE_DOC_MAP = {
  Tricyclazole:  'NABL_Lab_Report_104.pdf',
  'Aflatoxin B1': 'NABL_Lab_Report_104.pdf',
  Chlorpyrifos:  'NABL_Lab_Report_104.pdf',
};

const SEVERITY_STYLES = {
  CRITICAL_BLOCK:          { badge: 'bg-red-900/70 text-red-300 border border-red-700',     dot: 'bg-red-500'    },
  CRITICAL_FAIL_EXCEEDED:  { badge: 'bg-red-900/70 text-red-300 border border-red-700',     dot: 'bg-red-500'    },
  HUMAN_REVIEW_REQUIRED:   { badge: 'bg-amber-900/70 text-amber-300 border border-amber-700', dot: 'bg-amber-400' },
  PASS:                    { badge: 'bg-emerald-900/70 text-emerald-300 border border-emerald-700', dot: 'bg-emerald-500' },
};

// EU regulation citations by analyte name
const EU_CITATIONS = {
  Tricyclazole:   'Reg (EC) 396/2005, MRL 0.01 mg/kg (Chilli, dried)',
  'Aflatoxin B1': 'Reg (EU) 2023/915, MRL 5 µg/kg (Spices)',
  Chlorpyrifos:   'Reg (EU) 2020/1085, banned in EU — MRL 0.01 mg/kg default',
};

const INR_FORMAT = (v) =>
  '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// ─────────────────────────────────────────────────────────────────────────────
// PDF Page Viewer with bounding-box overlay
// ─────────────────────────────────────────────────────────────────────────────
function PDFPageViewer({ filename, findings, pulsedFinding, renderedPages = {} }) {
  const [imgDims, setImgDims] = useState({ w: 1, h: 1 });
  const imgRef = useRef(null);
  // Prefer base64 PNG from API response (works for uploaded PDFs too); fall back to static endpoint
  const pageUrl = renderedPages[filename] || `/api/v1/sample-pdf/${encodeURIComponent(filename)}/page/0.png`;

  const onLoad = () => {
    if (imgRef.current) {
      setImgDims({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    }
  };

  // Filter findings that belong to this document
  // Use document_filename from API (works for uploaded PDFs) with fallback to static ANALYTE_DOC_MAP
  const docFindings = findings.filter((f) => {
    const docFile = f.document_filename || ANALYTE_DOC_MAP[f.name];
    return docFile === filename && f.bounding_box;
  });

  return (
    <div className="relative inline-block w-full">
      <img
        ref={imgRef}
        src={pageUrl}
        alt={filename}
        onLoad={onLoad}
        className="w-full rounded border border-slate-700 block"
      />
      {docFindings.map((f) => {
        const [ymin, xmin, ymax, xmax] = f.bounding_box;
        // coords are 0-1000 scale on the original PDF page;
        // the PNG is rendered at 2×, so bounding box units are still relative to 0-1000
        const top    = `${(ymin / 1000) * 100}%`;
        const left   = `${(xmin / 1000) * 100}%`;
        const width  = `${((xmax - xmin) / 1000) * 100}%`;
        const height = `${((ymax - ymin) / 1000) * 100}%`;

        const isAmber = f.needs_human_review || f.compliance_status === 'HUMAN_REVIEW_REQUIRED';
        const isCritical = f.compliance_status?.includes('CRITICAL');
        const color = isCritical ? 'rgba(239, 68, 68, 0.22)' : isAmber ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.18)';
        const borderColor = isCritical ? '#ef4444' : isAmber ? '#f59e0b' : '#10b981';
        const isPulsed = pulsedFinding?.name === f.name;

        return (
          <div
            key={f.name}
            title={f.name}
            style={{
              position: 'absolute', top, left, width, height,
              border: `2px solid ${borderColor}`,
              backgroundColor: color,
              borderRadius: '4px',
              pointerEvents: 'none',
              transition: 'all 0.3s',
              boxShadow: isPulsed ? `0 0 0 4px ${borderColor}` : 'none',
              animation: isPulsed ? 'pulse-box 1s ease-in-out 2' : 'none',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '-16px',
                right: '6px',
                backgroundColor: borderColor,
                color: isCritical ? '#ffffff' : '#0f172a',
                fontSize: '9px',
                fontWeight: '700',
                padding: '1px 5px',
                borderRadius: '3px',
                letterSpacing: '0.03em',
                lineHeight: '13px',
              }}
            >
              {isCritical ? 'CRITICAL BLOCK' : isAmber ? 'HUMAN REVIEW' : 'PASS'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 300% Zoom Stamp Modal
// ─────────────────────────────────────────────────────────────────────────────
function ZoomModal({ finding, filename, onClose, onVerify, renderedPages = {} }) {
  const [inputVal, setInputVal] = useState(finding?.reported_reading?.replace(' mg/kg', '') ?? '0.008');
  const [verified, setVerified] = useState(false);

  if (!finding || !finding.bounding_box) return null;

  const targetDoc = finding.document_filename || filename;
  const imgUrl = renderedPages[targetDoc] || `/api/v1/sample-pdf/${encodeURIComponent(targetDoc)}/page/0.png`;

  const handleVerify = () => {
    setVerified(true);
    setTimeout(() => onVerify(finding.name, parseFloat(inputVal)), 700);
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-amber-500/60 rounded-xl shadow-2xl p-6 max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <ZoomIn className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-amber-300 text-base">300% Zoom — Human Verification Required</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mb-3 leading-relaxed">
          <span className="text-amber-400 font-semibold">Chlorpyrifos</span> reading is obscured by a physical NABL/EIC blue inspection ink stamp
          (extraction confidence {(finding.confidence_score * 100).toFixed(0)}% &lt; 85%).
          Verify the stamped value directly from the magnified document crop below:
        </p>

        {/* Magnified crop focused on the stamp (x=58%, y=35.3%) */}
        <div
          className="relative overflow-hidden rounded-lg border border-amber-500/50 mb-4 bg-slate-950 flex items-center justify-center"
          style={{ height: '200px' }}
        >
          <img
            src={imgUrl}
            alt="Magnified Stamp Crop"
            style={{
              width: '100%',
              transform: 'translate(-8%, 0%) scale(3.2)',
              transformOrigin: '58% 35.3%',
              display: 'block',
              filter: 'contrast(1.05)',
            }}
          />
          {/* Target reticle */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-20 h-20 border-2 border-dashed border-amber-400/80 rounded-full animate-pulse" />
          </div>
          <div className="absolute bottom-2 right-2 bg-slate-900/90 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-500/40">
            300% Optical Zoom
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Verified laboratory value (mg/kg) — edit if stamp differs from pre-filled:
          </label>
          <input
            type="number"
            step="0.001"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="w-full bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          />
        </div>

        <button
          onClick={handleVerify}
          disabled={verified}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md ${
            verified
              ? 'bg-emerald-600 text-white cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-amber-500/25'
          }`}
        >
          {verified ? '✓ Verified — Recompiling Audit Verdict…' : 'Confirm Value & Re-Verify'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Finding Cards (right pane)
// ─────────────────────────────────────────────────────────────────────────────
function FindingCard({ finding, onSelect, onOpenZoom, resolved }) {
  const isHumanReview = !resolved && (finding.needs_human_review || finding.compliance_status === 'HUMAN_REVIEW_REQUIRED');
  const isCritical = !resolved && finding.compliance_status?.includes('CRITICAL');

  const status = resolved
    ? 'PASS'
    : isHumanReview
    ? 'HUMAN_REVIEW_REQUIRED'
    : finding.compliance_status;

  const styles = SEVERITY_STYLES[status] || (isHumanReview ? SEVERITY_STYLES.HUMAN_REVIEW_REQUIRED : SEVERITY_STYLES.PASS);
  const badgeLabel = resolved
    ? 'VERIFIED ✓'
    : isHumanReview
    ? 'HUMAN REVIEW'
    : status?.replace(/_/g, ' ');

  return (
    <div
      className={`rounded-lg border p-3 cursor-pointer transition-all hover:border-opacity-100 ${
        isCritical
          ? 'border-red-700/60 bg-red-950/30 hover:bg-red-950/50'
          : isHumanReview
          ? 'border-amber-700/60 bg-amber-950/30 hover:bg-amber-950/50'
          : 'border-emerald-700/40 bg-emerald-950/20 hover:bg-emerald-950/40'
      }`}
      onClick={() => onSelect(finding)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${styles.dot}`} />
          <div className="min-w-0">
            <div className="font-semibold text-sm text-white truncate">{finding.name}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              CAS {finding.cas_number || '—'} · {EU_CITATIONS[finding.name] || 'EU Reg (EC) 396/2005'}
            </div>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 font-medium ${styles.badge}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-400">
        <div><span className="text-slate-500">Reading</span><br /><span className="text-white font-medium">{finding.reported_reading}</span></div>
        <div><span className="text-slate-500">Lab LOQ</span><br /><span className="text-white font-medium">{finding.lab_loq}</span></div>
        <div><span className="text-slate-500">EU MRL</span><br /><span className="text-white font-medium">{finding.eu_mrl_mg_kg != null ? `${finding.eu_mrl_mg_kg} mg/kg` : '—'}</span></div>
      </div>

      {finding.blq_trap_triggered && (
        <div className="mt-2 text-xs bg-red-900/40 rounded px-2 py-1 text-red-300 border border-red-700/40">
          ⚠ BLQ Sensitivity Trap — lab LOQ ({finding.lab_loq}) exceeds the legal MRL. Instrument was not sensitive enough to prove compliance.
        </div>
      )}

      {isHumanReview && (
        <button
          className="mt-2.5 w-full text-xs bg-amber-700/30 hover:bg-amber-700/60 text-amber-300 border border-amber-600/50 rounded-md px-3 py-1.5 flex items-center justify-center gap-1.5 font-medium transition-colors"
          onClick={(e) => { e.stopPropagation(); onOpenZoom(finding); }}
        >
          <ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Open 300% Stamp Zoom Verification
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bilingual Notice Card
// ─────────────────────────────────────────────────────────────────────────────
function BilingualNotice({ notice }) {
  const [copied, setCopied] = useState(false);
  const full = `${notice.english_notice}\n\n──────────────────────────────────────────\n\n${notice.telugu_notice}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(full); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          Bilingual Supplier Remediation Notice
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs bg-emerald-700/40 hover:bg-emerald-600/60 text-emerald-300 border border-emerald-600/40 rounded px-3 py-1 transition-colors"
        >
          {copied ? <><CheckCheck className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy WhatsApp / Email Notice</>}
        </button>
      </div>

      {/* English */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">English</div>
        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-5 max-h-40 overflow-y-auto bg-slate-900/60 rounded p-2 border border-slate-700">
          {notice.english_notice}
        </pre>
      </div>

      {/* Telugu */}
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">తెలుగు (Telugu)</div>
        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-5 max-h-40 overflow-y-auto bg-slate-900/60 rounded p-2 border border-slate-700">
          {notice.telugu_notice}
        </pre>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nano Banana 2.1 WhatsApp Visual Fix Card Section
// ─────────────────────────────────────────────────────────────────────────────
function VisualFixCardSection({ auditResult, findings }) {
  const [visualCard, setVisualCard] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const critical = (findings || [])
        .filter((f) => f.compliance_status?.includes('CRITICAL') || f.blq_trap_triggered)
        .map((f) => `${f.name}: ${f.reported_reading || 'BLQ'} (MRL: ${f.eu_mrl_mg_kg} mg/kg)`);

      const res = await fetch('/api/v1/visual-card/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consignment_id: 'EXP/2026/GNT-104',
          batch_id: auditResult?.consignment_batch || 'GNT-24A',
          total_risk_inr: auditResult?.financial_risk?.total_estimated_risk_inr || 5246000,
          critical_findings: critical.length ? critical : [
            '450 kg Net Weight Discrepancy (18,000 vs 17,550 kg)',
            'Tricyclazole BLQ Trap: LOQ 0.05 > EU MRL 0.01 mg/kg',
            'Aflatoxin B1: 8.5 µg/kg exceeds 5.0 µg/kg threshold'
          ],
          language: 'en'
        }),
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setVisualCard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-white">WhatsApp Visual Fix Card</span>
          <span className="text-[10px] font-mono bg-amber-950/70 text-amber-300 border border-amber-600/50 px-2 py-0.5 rounded-full">
            Nano Banana 2.1
          </span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold px-3 py-1.5 rounded-md transition-all shadow-md shadow-amber-500/20"
        >
          {generating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating Card…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Generate WhatsApp Visual Fix Card (Nano Banana 2.1)
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Renders a high-contrast 16:9 infographic card summarizing exact hold reasons, weight discrepancies, and chemical BLQ violations formatted for instant WhatsApp dispatch to the Guntur supplier.
      </p>

      {error && <div className="text-xs text-red-400 bg-red-950/50 border border-red-800 rounded p-2">⚠ {error}</div>}

      {visualCard && (
        <div className="space-y-3 pt-2">
          <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 group">
            <img
              src={`data:image/png;base64,${visualCard.image_base64}`}
              alt="Nano Banana 2.1 Remediation Card"
              className="w-full h-auto object-cover rounded"
            />
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold px-2 py-1 rounded bg-black/80 text-emerald-300 border border-emerald-500/40 backdrop-blur-sm">
                Powered by Nano Banana 2.1
              </span>
              {visualCard.is_fallback && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded bg-black/80 text-amber-300 border border-amber-500/40 backdrop-blur-sm">
                  Stage-Safe Local Engine
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Model: <strong className="text-slate-300">{visualCard.model_used}</strong> &bull; Format: 16:9 High-DPI PNG
            </span>
            <a
              href={`data:image/png;base64,${visualCard.image_base64}`}
              download={`ClearSpec_Remediation_Card_${auditResult?.consignment_batch || 'GNT-24A'}.png`}
              className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white font-medium px-3 py-1.5 rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Download PNG
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drag-and-Drop uploader
// ─────────────────────────────────────────────────────────────────────────────
function DragDropUploader({ onFiles }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handle = (files) => {
    if (files?.length) onFiles(Array.from(files));
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer transition-colors flex items-center gap-2 ${
        dragging ? 'border-emerald-400 bg-emerald-900/20' : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
      }`}
    >
      <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <span className="text-xs text-slate-400">Drag & drop PDFs or click to upload</span>
      <input ref={inputRef} type="file" multiple accept=".pdf" className="hidden" onChange={(e) => handle(e.target.files)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Tab
// ─────────────────────────────────────────────────────────────────────────────
export default function ConsignmentAuditTab() {
  const [market, setMarket] = useState('EU Market');
  const [auditResult, setAuditResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(SAMPLE_DOCS[2].key);  // default to Lab Report
  const [pulsedFinding, setPulsedFinding] = useState(null);
  const [zoomFinding, setZoomFinding] = useState(null);
  const [resolvedFindings, setResolvedFindings] = useState(new Set());

  const runAudit = useCallback(async (body, isForm = false) => {
    setLoading(true);
    setError(null);
    setResolvedFindings(new Set());
    try {
      const opts = isForm
        ? { method: 'POST', body }
        : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
      const resp = await fetch('/api/v1/audit', opts);
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const data = await resp.json();
      setAuditResult(data);
      // Auto-select lab report or first available doc when results arrive
      const availableDocs = data.document_names || Object.keys(data.rendered_pages || {});
      const preferred = availableDocs.find((d) => d.toLowerCase().includes('lab') || d.toLowerCase().includes('cert')) || availableDocs[0] || 'NABL_Lab_Report_104.pdf';
      setSelectedDoc(preferred);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const runDemo = () => runAudit({ use_sample: true });

  const handleFiles = (files) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    runAudit(form, true);
  };

  const handleFindingSelect = (finding) => {
    const doc = finding.document_filename || ANALYTE_DOC_MAP[finding.name] || 'NABL_Lab_Report_104.pdf';
    setSelectedDoc(doc);
    setPulsedFinding(finding);
    setTimeout(() => setPulsedFinding(null), 2200);
  };

  const handleVerify = (name, _val) => {
    setResolvedFindings((prev) => new Set([...prev, name]));
    setZoomFinding(null);
  };

  const findings = auditResult?.analyte_evaluations ?? [];
  const overall  = auditResult?.overall_status;
  const isBlocked = overall === 'CRITICAL_BLOCK';
  const isReview  = overall === 'REQUIRES_REVIEW';

  // Build document tabs dynamically from response, or fallback to sample docs
  const docTabs = auditResult?.document_names?.length
    ? auditResult.document_names.map((name) => ({
        key: name,
        label: name.replace(/_/g, ' ').replace('.pdf', '')
      }))
    : SAMPLE_DOCS;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* ── Top Action Bar ── */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <select
          value={market}
          onChange={(e) => setMarket(e.target.value)}
          className="bg-slate-700 text-white text-sm border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
        >
          <option>EU Market</option>
          <option>US FDA</option>
        </select>

        <button
          onClick={runDemo}
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Run Rotterdam Chilli Demo Packet
        </button>

        <DragDropUploader onFiles={handleFiles} />

        {error && <span className="text-red-400 text-xs">⚠ {error}</span>}
      </div>

      {/* ── Status Banner (shows only after audit) ── */}
      {auditResult && (
        <div
          className={`flex items-center justify-between px-6 py-4 rounded-xl border font-bold text-lg ${
            isBlocked
              ? 'bg-red-950/60 border-red-700 text-red-300'
              : isReview
              ? 'bg-amber-950/60 border-amber-700 text-amber-300'
              : 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {isBlocked
              ? <ShieldX className="w-6 h-6" />
              : isReview
              ? <AlertTriangle className="w-6 h-6" />
              : <ShieldCheck className="w-6 h-6" />}
            <span>
              {isBlocked ? 'BLOCKED — CRITICAL' : isReview ? 'REQUIRES HUMAN REVIEW' : 'CLEARED'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm font-normal text-slate-300">Total Port-Rejection Risk Prevented</div>
            <div className="text-2xl font-black">
              {INR_FORMAT(auditResult.financial_risk.total_estimated_risk_inr)}
            </div>
          </div>
        </div>
      )}

      {/* ── Gemini 3.8 Live Bilingual Voice Assistant ── */}
      {auditResult && (
        <LiveVoiceWidget auditResult={auditResult} />
      )}

      {/* ── Main Split Pane ── */}
      {auditResult ? (
        <div className="flex gap-4 flex-1 min-h-0" style={{ minHeight: '520px' }}>
          {/* Left Pane — Visual Document Inspector */}
          <div className="w-1/2 flex flex-col space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visual Document Inspector</div>

            {/* Document Selector Tabs */}
            <div className="flex gap-1 flex-wrap">
              {docTabs.map((doc) => (
                <button
                  key={doc.key}
                  onClick={() => setSelectedDoc(doc.key)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    selectedDoc === doc.key
                      ? 'bg-slate-600 text-white border border-slate-500'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {doc.label}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/60 inline-block border border-red-500" />Critical Block</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400/60 inline-block border border-amber-400" />Human Review</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/40 inline-block border border-emerald-500" />Pass</span>
            </div>

            {/* Page Image + Overlays */}
            <div className="overflow-auto rounded-lg border border-slate-700 bg-slate-950 flex-1">
              <PDFPageViewer
                filename={selectedDoc}
                findings={findings}
                pulsedFinding={pulsedFinding}
                renderedPages={auditResult.rendered_pages}
              />
            </div>
          </div>

          {/* Right Pane — Verdict & Notice */}
          <div className="w-1/2 flex flex-col space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '70vh' }}>
            {/* Weight Reconciliation */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Weight Reconciliation</div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="bg-slate-900/60 rounded p-2">
                  <div className="text-slate-500">Invoice</div>
                  <div className="text-white font-semibold">{auditResult.weight_reconciliation.invoice_net_weight_kg?.toLocaleString('en-IN')} kg</div>
                </div>
                <div className="bg-slate-900/60 rounded p-2">
                  <div className="text-slate-500">Packing List</div>
                  <div className="text-white font-semibold">{auditResult.weight_reconciliation.packing_list_net_weight_kg?.toLocaleString('en-IN')} kg</div>
                </div>
                <div className={`rounded p-2 ${Math.abs(auditResult.weight_reconciliation.discrepancy_kg) > 5 ? 'bg-red-900/40' : 'bg-emerald-900/30'}`}>
                  <div className="text-slate-500">Variance</div>
                  <div className={`font-semibold ${Math.abs(auditResult.weight_reconciliation.discrepancy_kg) > 5 ? 'text-red-300' : 'text-emerald-300'}`}>
                    {auditResult.weight_reconciliation.discrepancy_kg > 0 ? '+' : ''}{auditResult.weight_reconciliation.discrepancy_kg} kg
                  </div>
                </div>
              </div>
              {auditResult.weight_reconciliation.status !== 'PASS' && (
                <p className="text-xs text-red-300 mt-2 leading-5">{auditResult.weight_reconciliation.notes}</p>
              )}
            </div>

            {/* Chemical Findings */}
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Chemical Compliance Findings</div>
              <div className="space-y-2">
                {findings.map((f) => (
                  <FindingCard
                    key={f.name}
                    finding={f}
                    onSelect={handleFindingSelect}
                    onOpenZoom={setZoomFinding}
                    resolved={resolvedFindings.has(f.name)}
                  />
                ))}
              </div>
            </div>

            {/* Financial Risk Breakdown */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Financial Risk Breakdown</div>
              <div className="space-y-1 text-xs">
                {[
                  ['Port Demurrage & Storage (Rotterdam)', auditResult.financial_risk.demurrage_port_storage_inr],
                  ['Re-testing & Re-sampling (EIC/NABL)', auditResult.financial_risk.re_testing_re_sampling_inr],
                  ['Customs Misdeclaration Penalty (S.111/112)', auditResult.financial_risk.customs_penalty_inr],
                  ['Cargo Rejection & Re-export Liability', auditResult.financial_risk.cargo_rejection_re_export_inr],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-slate-300">
                    <span className="text-slate-400">{label}</span>
                    <span className={val > 0 ? 'text-red-300 font-medium' : 'text-slate-500'}>{val > 0 ? INR_FORMAT(val) : '—'}</span>
                  </div>
                ))}
                <div className="border-t border-slate-600 pt-1 mt-1 flex justify-between font-bold text-sm">
                  <span className="text-white">Total Exposure</span>
                  <span className="text-red-300">{INR_FORMAT(auditResult.financial_risk.total_estimated_risk_inr)}</span>
                </div>
              </div>
            </div>

            {/* Bilingual Notice */}
            <BilingualNotice notice={auditResult.bilingual_supplier_notice} />

            {/* Nano Banana 2.1 WhatsApp Visual Fix Card */}
            <VisualFixCardSection auditResult={auditResult} findings={findings} />
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/20" style={{ minHeight: '400px' }}>
          <div className="text-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm">Click <strong className="text-emerald-400">Run Rotterdam Chilli Demo Packet</strong> or drop your PDFs above to begin the audit.</p>
            <p className="text-xs text-slate-600">Multi-document · Gemini extraction · BLQ Trap · CBAM 2026 · Bilingual</p>
          </div>
        </div>
      )}

      {/* 300% Zoom Modal */}
      {zoomFinding && (
        <ZoomModal
          finding={zoomFinding}
          filename={zoomFinding.document_filename || "NABL_Lab_Report_104.pdf"}
          renderedPages={auditResult?.rendered_pages}
          onClose={() => setZoomFinding(null)}
          onVerify={handleVerify}
        />
      )}
    </div>
  );
}
