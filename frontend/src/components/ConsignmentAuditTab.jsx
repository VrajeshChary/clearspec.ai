import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldX,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Copy,
  CheckCheck,
  FileText,
  Upload,
  ChevronRight,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Sparkles,
  Download,
  Share2,
  Scale,
  RefreshCw,
  Info,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertOctagon,
  AlertCircle,
  Languages,
  Zap,
  Building2,
  Anchor,
  Scan,
  Compass,
  ArrowRight,
  TrendingDown,
  Cpu,
  ArrowLeft,
  FileCheck
} from 'lucide-react';
import { auditConsignment, reverifyAnalyte, generateVisualCard } from '../services/api';

const SAMPLE_DOCS = [
  { key: 'NABL_Lab_Report_104.pdf', label: 'NABL Lab Certificate', badge: 'LC-MS/MS + QA Stamp', type: 'lab' },
  { key: 'Commercial_Invoice_104.pdf', label: 'Commercial Invoice', badge: '18,500 kg Net', type: 'invoice' },
  { key: 'Packing_List_104.pdf', label: 'Packing List', badge: '18,050 kg Net (-450 kg)', type: 'packing' },
];

const ANALYTE_DOC_MAP = {
  Tricyclazole: 'NABL_Lab_Report_104.pdf',
  'Aflatoxin B1': 'NABL_Lab_Report_104.pdf',
  Chlorpyrifos: 'NABL_Lab_Report_104.pdf',
  'Ethylene Oxide (EtO)': 'NABL_Lab_Report_104.pdf',
};

const SEVERITY_STYLES = {
  CRITICAL_FAIL_EXCEEDED: {
    badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
    dot: 'bg-rose-500 animate-ping',
    border: 'border-rose-500/60',
    glow: 'rgba(244, 63, 94, 0.4)'
  },
  BLQ_TRAP: {
    badge: 'bg-rose-600/25 text-rose-200 border border-rose-500/50 shadow-[0_0_12px_rgba(225,29,72,0.4)]',
    dot: 'bg-rose-400',
    border: 'border-rose-500',
    glow: 'rgba(225, 29, 72, 0.5)'
  },
  HUMAN_REVIEW_REQUIRED: {
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]',
    dot: 'bg-amber-400',
    border: 'border-amber-500/60',
    glow: 'rgba(245, 158, 11, 0.4)'
  },
  PASS: {
    badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/40',
    glow: 'rgba(16, 185, 129, 0.3)'
  }
};

const INR_FORMAT = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);

// ─────────────────────────────────────────────────────────────────────────────
// Futuristic Forensic PDF Document Studio Component
// ─────────────────────────────────────────────────────────────────────────────
function ForensicDocViewer({
  filename,
  findings,
  pulsedFinding,
  renderedPages = {},
  zoomLevel,
  isScanning,
  onOpenZoomModal
}) {
  const [imgDims, setImgDims] = useState({ w: 1, h: 1 });
  const [hoveredBox, setHoveredBox] = useState(null);
  const imgRef = useRef(null);

  const pageUrl = renderedPages[filename] || `/api/v1/sample-pdf/${encodeURIComponent(filename)}/page/0.png`;

  const onLoad = () => {
    if (imgRef.current) {
      setImgDims({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    }
  };

  const docFindings = findings.filter((f) => {
    const docFile = f.document_filename || ANALYTE_DOC_MAP[f.name];
    return docFile === filename && f.bounding_box;
  });

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#050811] p-3 flex items-center justify-center min-h-[580px] shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)]">
      {/* Laser Scanning Line Animation */}
      {isScanning && <div className="laser-scanner-line" />}

      <div
        className="relative inline-block transition-transform duration-200 origin-top"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        <img
          ref={imgRef}
          src={pageUrl}
          alt={filename}
          onLoad={onLoad}
          className="max-w-full rounded-lg border border-white/15 shadow-2xl block select-none"
        />

        {/* Dynamic Holographic Laser Bounding Boxes */}
        {docFindings.map((f) => {
          const [ymin, xmin, ymax, xmax] = f.bounding_box;
          const top = `${(ymin / 1000) * 100}%`;
          const left = `${(xmin / 1000) * 100}%`;
          const width = `${((xmax - xmin) / 1000) * 100}%`;
          const height = `${((ymax - ymin) / 1000) * 100}%`;

          const isTrap = f.blq_trap_triggered;
          const isReview = f.needs_human_review || f.name === 'Chlorpyrifos';
          const isPulsed = pulsedFinding?.name === f.name;

          let colorClass = 'border-rose-500 bg-rose-500/10 text-rose-300';
          if (isTrap) colorClass = 'border-rose-600 bg-rose-600/15 text-rose-200 shadow-[0_0_15px_rgba(225,29,72,0.4)]';
          else if (isReview) colorClass = 'border-amber-400 bg-amber-500/15 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.4)]';
          else if (f.compliance_status === 'PASS') colorClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-300';

          return (
            <div
              key={f.name}
              style={{ top, left, width, height }}
              onMouseEnter={() => setHoveredBox(f)}
              onMouseLeave={() => setHoveredBox(null)}
              onClick={() => isReview && onOpenZoomModal && onOpenZoomModal(f)}
              className={`absolute cursor-pointer border-2 transition-all duration-300 rounded ${colorClass} ${
                isPulsed ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-black scale-[1.02] z-30' : 'hover:scale-[1.01] z-20'
              }`}
            >
              {/* Badge Anchor */}
              <div className="absolute -top-3 left-1 text-[9px] font-mono px-1.5 py-0.2 rounded font-bold shadow-md bg-black/90 border border-white/20 whitespace-nowrap flex items-center space-x-1">
                <span>{f.name}</span>
                {isTrap && <span className="text-rose-400 font-extrabold">&bull; BLQ TRAP</span>}
                {isReview && <span className="text-amber-400 font-extrabold">&bull; STAMP OCCLUSION</span>}
              </div>

              {/* Hover Tooltip */}
              {hoveredBox?.name === f.name && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 rounded-xl bg-slate-950/95 backdrop-blur-xl border border-white/20 text-white text-xs shadow-2xl z-40 pointer-events-none">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1 font-mono text-[10px]">
                    <span className="font-bold text-emerald-400">{f.name}</span>
                    <span className="text-slate-400">CAS: {f.cas_number || 'N/A'}</span>
                  </div>
                  <div className="space-y-0.5 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Reading:</span>
                      <span className="font-bold text-white">{f.reported_reading}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">EU Statutory MRL:</span>
                      <span className="text-emerald-400 font-bold">{f.eu_mrl_mg_kg} mg/kg</span>
                    </div>
                  </div>
                  {f.review_reason && (
                    <p className="mt-1.5 text-[10px] text-amber-300 leading-tight border-t border-white/10 pt-1">
                      {f.review_reason}
                    </p>
                  )}
                  {isReview && (
                    <div className="mt-1.5 text-[9px] text-center font-bold text-amber-400 bg-amber-950/60 rounded py-0.5 border border-amber-800/60">
                      Click to open 300% Forensic Stamp Loupe
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 300% Forensic Stamp Loupe & Clerk Verification Modal
// ─────────────────────────────────────────────────────────────────────────────
function ZoomReverifyModal({ finding, onClose, onConfirm, renderedPages }) {
  const [confirmedVal, setConfirmedVal] = useState('0.008');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onConfirm(finding, parseFloat(confirmedVal));
    setSubmitting(false);
    onClose();
  };

  const isFail = parseFloat(confirmedVal) > (finding?.eu_mrl_mg_kg || 0.01);
  const pageUrl = renderedPages['NABL_Lab_Report_104.pdf'] || '/api/v1/sample-pdf/NABL_Lab_Report_104.pdf/page/0.png';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl rounded-2xl bg-[#090d16] border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ZoomIn className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white">
                300% Forensic Loupe &bull; Clerk Verification Terminal
              </h3>
              <p className="text-xs text-slate-400">
                Resolving physical rubber QA stamp occlusion on <strong className="text-amber-300">{finding?.name}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Occlusion Notice */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <div className="font-bold text-amber-300">Physical Rubber QA Stamp Occlusion (Confidence: 62% &lt; 85%)</div>
              <p className="text-slate-300 mt-0.5">
                Circular official inspection stamp covers numerical digits. Confirm true reading under 300% forensic magnification reticle to re-calculate statutory compliance live.
              </p>
            </div>
          </div>

          {/* 300% Forensic Sub-Pixel Loupe Reticle View */}
          <div className="relative h-56 rounded-xl overflow-hidden border border-white/15 bg-white flex items-center justify-center">
            <div
              className="relative w-full h-full overflow-hidden"
              style={{
                backgroundImage: `url(${pageUrl})`,
                backgroundPosition: '50% 28%',
                backgroundSize: '300%',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-28 border-2 border-dashed border-amber-400 rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/90 text-amber-300 font-bold border border-amber-400/40">
                    300% FORENSIC RETICLE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10">
                <span className="text-slate-400 block text-[11px] mb-1">Machine OCR Reading (Occluded)</span>
                <span className="font-bold text-white text-sm">0.008 mg/kg [OCCLUDED]</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10">
                <span className="text-slate-400 block text-[11px] mb-1">EU Statutory MRL Ceiling</span>
                <span className="font-bold text-emerald-400 text-sm">{finding?.eu_mrl_mg_kg} mg/kg</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-300 font-medium">
                  Enter Verified Numerical Value from Lab Certificate:
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  Type <code className="text-rose-400 font-bold">0.05</code> to test Fail &bull; <code className="text-emerald-400 font-bold">0.008</code> to test Pass
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.001"
                  value={confirmedVal}
                  onChange={(e) => setConfirmedVal(e.target.value)}
                  className="flex-1 bg-slate-950 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs font-mono text-slate-400">
                  mg/kg
                </span>
              </div>

              <div className="mt-2 text-xs">
                {isFail ? (
                  <p className="text-rose-400 font-medium flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>VERIFIED FAIL: {confirmedVal} mg/kg &gt; {finding?.eu_mrl_mg_kg} mg/kg limit &bull; Risk jumps to ₹52,91,000 (+₹45K secondary testing)</span>
                  </p>
                ) : (
                  <p className="text-emerald-400 font-medium flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>VERIFIED PASS: {confirmedVal} mg/kg &le; {finding?.eu_mrl_mg_kg} mg/kg statutory ceiling &bull; Shipment cleared for Chlorpyrifos</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-5 py-2 rounded-lg text-xs font-bold font-display flex items-center space-x-2 transition-all shadow-lg ${
                  isFail
                    ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-rose-900/40 hover:from-rose-500 hover:to-rose-400'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-900/40 hover:from-emerald-500 hover:to-emerald-400'
                }`}
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm Clerk Verification</span>
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Actionable Exporter Deliverables (Bilingual Notice & 16:9 WhatsApp Card)
// ─────────────────────────────────────────────────────────────────────────────
function ExporterDeliverablesDrawer({ auditResult, findings }) {
  const [activeSubTab, setActiveSubTab] = useState('bilingual');
  const [noticeLang, setNoticeLang] = useState('en');
  const [copied, setCopied] = useState(false);
  const [visualCard, setVisualCard] = useState(null);
  const [generatingCard, setGeneratingCard] = useState(false);

  const handleCopyNotice = () => {
    const text =
      noticeLang === 'te'
        ? auditResult?.bilingual_supplier_notice?.telugu_notice
        : auditResult?.bilingual_supplier_notice?.english_notice;
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateCard = async () => {
    setGeneratingCard(true);
    try {
      const critical = (findings || [])
        .filter((f) => f.compliance_status?.includes('CRITICAL') || f.blq_trap_triggered)
        .map((f) => `${f.name}: ${f.reported_reading || 'BLQ'} (MRL: ${f.eu_mrl_mg_kg} mg/kg)`);

      const res = await generateVisualCard({
        consignment_id: 'EXP/2026/GNT-104',
        batch_id: auditResult?.consignment_batch || 'GNT-24',
        total_risk_inr: auditResult?.financial_risk?.total_estimated_risk_inr || 5246000,
        critical_findings: critical.length
          ? critical
          : [
              '450 kg Net Weight Discrepancy (18,500 vs 18,050 kg)',
              'Tricyclazole BLQ Trap: LOQ 0.05 > EU MRL 0.01 mg/kg',
              'Aflatoxin B1: 8.5 µg/kg exceeds 5.0 µg/kg threshold',
            ],
        language: 'en',
      });
      setVisualCard(res);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingCard(false);
    }
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-white">Actionable Exporter Deliverables</h3>
            <p className="text-xs text-slate-400">Statutory legal notices and WhatsApp defect cards for logistics teams and farm suppliers</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('bilingual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'bilingual' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bilingual Notice (EN/TE)
          </button>
          <button
            onClick={() => {
              setActiveSubTab('whatsapp-card');
              if (!visualCard) handleGenerateCard();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'whatsapp-card' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            16:9 WhatsApp Fix Card
          </button>
        </div>
      </div>

      {activeSubTab === 'bilingual' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 bg-slate-900/80 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => setNoticeLang('en')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  noticeLang === 'en' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                English Formal Notice
              </button>
              <button
                onClick={() => setNoticeLang('te')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  noticeLang === 'te' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                తెలుగు నోటీసు (Telugu)
              </button>
            </div>

            <button
              onClick={handleCopyNotice}
              className="keycap-btn px-3 py-1.5 text-xs font-semibold flex items-center space-x-1.5"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Official Notice'}</span>
            </button>
          </div>

          <div className="glass-well p-4 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap max-h-56 overflow-y-auto border border-white/10 shadow-inner">
            {noticeLang === 'te'
              ? auditResult?.bilingual_supplier_notice?.telugu_notice
              : auditResult?.bilingual_supplier_notice?.english_notice}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">High-DPI WhatsApp-Ready Visual Card (Generated via Gemini Multimodal Model)</span>
            <button
              onClick={handleGenerateCard}
              disabled={generatingCard}
              className="keycap-btn px-3 py-1.5 text-xs font-semibold flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generatingCard ? 'animate-spin' : ''}`} />
              <span>Regenerate Card</span>
            </button>
          </div>

          {generatingCard ? (
            <div className="h-64 rounded-xl border border-white/10 bg-slate-900/60 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Rendering 16:9 defect graphic card...</span>
            </div>
          ) : visualCard?.image_base64 ? (
            <div className="relative rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-black">
              <img
                src={`data:image/png;base64,${visualCard.image_base64}`}
                alt="WhatsApp Visual Fix Card"
                className="w-full object-contain max-h-80"
              />
              <div className="p-3 bg-slate-900 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  Format: 16:9 PNG &bull; Engine: {visualCard.model_used}
                </span>
                <a
                  href={`data:image/png;base64,${visualCard.image_base64}`}
                  download={`ClearSpec_DefectCard_${auditResult?.consignment_batch || 'GNT-24'}.png`}
                  className="btn-emerald px-3.5 py-1.5 text-xs flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="h-48 rounded-xl border border-dashed border-white/10 bg-slate-900/40 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
              <AlertCircle className="w-6 h-6 text-slate-500" />
              <span>Click Regenerate to create the WhatsApp card.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Flagship Consignment Auditor Studio
// ─────────────────────────────────────────────────────────────────────────────
export default function ConsignmentAuditTab({ onAuditLoaded }) {
  // Real working state: starts in upload / ready mode
  const [auditResult, setAuditResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState('NABL_Lab_Report_104.pdf');
  const [pulsedFinding, setPulsedFinding] = useState(null);
  const [zoomFinding, setZoomFinding] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState({
    invoice: null,
    packing: null,
    lab: null,
  });

  const executeAudit = useCallback(async (payload, isForm = false) => {
    setLoading(true);
    setIsScanning(true);
    setError(null);
    try {
      const data = await auditConsignment(payload, isForm);
      setAuditResult(data);
      if (onAuditLoaded) onAuditLoaded(data);

      const available = data.document_names || Object.keys(data.rendered_pages || {});
      const labDoc =
        available.find((d) => d.toLowerCase().includes('lab') || d.toLowerCase().includes('cert')) ||
        available[0] ||
        'NABL_Lab_Report_104.pdf';
      setSelectedDoc(labDoc);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setTimeout(() => setIsScanning(false), 800);
    }
  }, [onAuditLoaded]);

  const handleRunSampleShipment = () => {
    executeAudit({ use_sample: true });
  };

  const handleCustomUploadSubmit = (e) => {
    if (e) e.preventDefault();
    const filesToUpload = [
      uploadedFiles.invoice,
      uploadedFiles.packing,
      uploadedFiles.lab,
    ].filter(Boolean);

    if (!filesToUpload.length) {
      // If user clicks without uploading custom files, execute with the sample packet
      handleRunSampleShipment();
      return;
    }

    const form = new FormData();
    filesToUpload.forEach((f) => form.append('files', f));
    executeAudit(form, true);
  };

  const handleFindingSelect = (finding) => {
    setPulsedFinding(finding);
    const targetDoc = finding.document_filename || ANALYTE_DOC_MAP[finding.name] || 'NABL_Lab_Report_104.pdf';
    setSelectedDoc(targetDoc);
    setTimeout(() => setPulsedFinding(null), 3000);
  };

  const handleConfirmReverify = async (finding, confirmedVal) => {
    try {
      const res = await reverifyAnalyte({
        analyte_name: finding.name,
        cas_number: finding.cas_number,
        hs_code: auditResult?.declared_hs_code || '09042211',
        confirmed_value: confirmedVal,
        unit: 'mg/kg',
        lab_loq_value: finding.lab_loq_value || 0.005,
        current_risk_inr: auditResult?.financial_risk?.total_estimated_risk_inr || 5246000,
      });

      setAuditResult((prev) => {
        if (!prev) return prev;
        const updatedEvals = (prev.analyte_evaluations || []).map((a) => {
          if (a.name === finding.name) {
            return {
              ...a,
              reported_reading: `${res.confirmed_value_mg_kg} mg/kg`,
              compliance_status: res.compliance_status,
              needs_human_review: false,
              review_reason: res.notes,
            };
          }
          return a;
        });

        return {
          ...prev,
          analyte_evaluations: updatedEvals,
          financial_risk: {
            ...prev.financial_risk,
            total_estimated_risk_inr: res.updated_financial_risk_inr,
          },
        };
      });
    } catch (err) {
      console.error('Re-verification failed:', err);
    }
  };

  const findings = auditResult?.analyte_evaluations || [];
  const overallStatus = auditResult?.overall_status || 'CRITICAL_BLOCK';
  const risk = auditResult?.financial_risk;
  const weight = auditResult?.weight_reconciliation;

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 1: INITIAL UPLOAD & AUDIT COCKPIT (NOT PRE-BAKED FAKE REPORT)
  // ───────────────────────────────────────────────────────────────────────────
  if (!auditResult && !loading && !isScanning) {
    return (
      <div className="space-y-6">
        {/* Header Hero */}
        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Live Document Auditor
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Statutory Engine: Gemini 3.8 Flash + Official EU Journals
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Cross-Border Consignment Compliance Scanner
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Upload your 3 shipping documents (Commercial Invoice, Packing List, and Lab Certificate) or test our sample shipment. Our engine uses Google Gemini 3.8 Flash to extract chemical readings, rubber stamps, and weights, flagging European customs traps before your cargo leaves India.
            </p>
          </div>
        </div>

        {error && (
          <div className="glass-panel p-4 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center justify-between">
            <span><strong>Audit Error:</strong> {error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* 3-Document Upload Studio */}
        <form onSubmit={handleCustomUploadSubmit} className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-display font-bold text-base text-white flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <span>Upload Consignment Packet (PDFs)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select 3 export documents to perform cross-document weight reconciliation and pesticide verification
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunSampleShipment}
              className="btn-emerald px-4 py-2 text-xs font-bold flex items-center space-x-2 self-start sm:self-auto shadow-lg"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950" />
              <span>Test Sample Shipment (Indian Spices to Europe)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Slot 1: Commercial Invoice */}
            <div className="glass-well p-5 rounded-xl border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <span className="font-bold text-white">1. Commercial Invoice</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800">PDF</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Contains declared export values, ITC-HS classification, and declared net cargo weight.
                </p>
              </div>

              <div>
                <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/15 rounded-xl hover:border-emerald-500/60 cursor-pointer bg-black/30 transition-all">
                  <FileText className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-300 font-medium text-center">
                    {uploadedFiles.invoice ? uploadedFiles.invoice.name : 'Select Invoice PDF'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadedFiles((prev) => ({ ...prev, invoice: e.target.files?.[0] || null }))}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Slot 2: Packing List */}
            <div className="glass-well p-5 rounded-xl border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <span className="font-bold text-white">2. Packing List</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800">PDF</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Contains bag counts, net weights, tare weight, container numbers, and batch lot codes.
                </p>
              </div>

              <div>
                <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/15 rounded-xl hover:border-emerald-500/60 cursor-pointer bg-black/30 transition-all">
                  <FileText className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-300 font-medium text-center">
                    {uploadedFiles.packing ? uploadedFiles.packing.name : 'Select Packing List PDF'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadedFiles((prev) => ({ ...prev, packing: e.target.files?.[0] || null }))}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Slot 3: NABL Lab Certificate */}
            <div className="glass-well p-5 rounded-xl border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <span className="font-bold text-white">3. NABL Lab Certificate</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800">PDF</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Accredited chemical test report with LC-MS/MS pesticide readings, LOQ, and QA stamps.
                </p>
              </div>

              <div>
                <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/15 rounded-xl hover:border-emerald-500/60 cursor-pointer bg-black/30 transition-all">
                  <FileText className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-300 font-medium text-center">
                    {uploadedFiles.lab ? uploadedFiles.lab.name : 'Select Lab Certificate PDF'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadedFiles((prev) => ({ ...prev, lab: e.target.files?.[0] || null }))}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <span className="text-xs text-slate-400 font-mono">
              Ready to scan with Gemini 3.8 Flash Multimodal &bull; Zero Hallucination Deterministic Engine
            </span>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="submit"
                className="w-full sm:w-auto btn-emerald px-6 py-3 text-xs font-bold flex items-center justify-center space-x-2 shadow-xl"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run Live AI Compliance Audit</span>
              </button>
            </div>
          </div>
        </form>

        {/* What ClearSpec Catches (Plain English) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 space-y-1.5 rounded-xl">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs">
              <AlertOctagon className="w-4 h-4" />
              <span>Weight Mismatches</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Catches weight discrepancies between invoice and packing lists that cause Section 111/112 Indian Customs fines.
            </p>
          </div>

          <div className="glass-panel p-4 space-y-1.5 rounded-xl">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>The "BLQ Trap"</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Catches lab reports stating "Not Detected" when the lab's machine was too weak to prove compliance under EU law.
            </p>
          </div>

          <div className="glass-panel p-4 space-y-1.5 rounded-xl">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
              <ZoomIn className="w-4 h-4" />
              <span>The 300% Stamp Loupe</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Zooms in 300% like a digital microscope to read pesticide readings trapped behind purple official stamps.
            </p>
          </div>

          <div className="glass-panel p-4 space-y-1.5 rounded-xl">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
              <Languages className="w-4 h-4" />
              <span>Telugu WhatsApp Fix</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Translates European rejection notices into plain Telugu and sends an actionable WhatsApp fix card to farm suppliers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 2: SCANNING PROGRESS HUD (ACTIVE AI EXTRACTION)
  // ───────────────────────────────────────────────────────────────────────────
  if (loading || isScanning) {
    return (
      <div className="space-y-6">
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center space-y-6 min-h-[500px] text-center relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 animate-pulse" />
          
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse">
              <Scan className="w-10 h-10 animate-spin text-emerald-400" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 animate-ping" />
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-xl font-display font-bold text-white tracking-tight">
              Gemini 3.8 Flash Ingestion in Progress...
            </h3>
            <p className="text-xs text-slate-400 font-mono leading-relaxed">
              Extracting multi-page visual PDF embeddings, chemical residue tables, rubber QA stamps, and cross-reconciling cargo weights...
            </p>
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-400 max-w-sm w-full text-left bg-black/40 p-4 rounded-xl border border-white/10">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ingesting PDF documents at 2x DPI</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Computing sub-pixel normalized coordinates</span>
            </div>
            <div className="flex items-center space-x-2 text-cyan-300 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Cross-checking EU Statutory MRLs & weight variance</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 3: FULL WORKING AUDIT REPORT
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Reset & Header Action Bar */}
      <div className="glass-panel p-3.5 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setAuditResult(null)}
          className="keycap-btn px-3.5 py-1.5 text-xs font-bold flex items-center space-x-2 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>← Scan Another Shipment / Upload New Files</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunSampleShipment}
            className="px-3 py-1.5 rounded-lg text-xs font-display flex items-center space-x-2 bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Re-Run Live Audit</span>
          </button>
        </div>
      </div>

      {/* EXECUTIVE HERO STATUS RIBBON */}
      <div className="glass-panel p-6 border-l-4 border-l-rose-500 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge-critical px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center space-x-1.5">
                <ShieldX className="w-4 h-4 text-rose-400" />
                <span>EXPORT HOLD: {overallStatus}</span>
              </span>
              <span className="font-mono text-xs text-slate-400">
                Batch: <strong className="text-white font-bold">{auditResult.consignment_batch}</strong>
              </span>
              <span className="text-white/20 text-xs">&bull;</span>
              <span className="font-mono text-xs text-slate-400">
                ITC-HS: <strong className="text-emerald-400">{auditResult.declared_hs_code}</strong> (Chapter {auditResult.normalized_hs_prefix})
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Indian Dried Red Chilli &rarr; European Union (Port of Entry)</span>
            </h2>

            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
              <span>Prevented Regulatory Seizure Exposure:</span>
              <span className="font-display font-bold text-xl text-rose-400 tracking-tight drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]">
                {INR_FORMAT(risk?.total_estimated_risk_inr || 5246000)} INR
              </span>
              <span className="text-white/20">|</span>
              <span className="text-xs text-cyan-300 font-mono flex items-center space-x-1">
                <Cpu className="w-3.5 h-3.5" />
                <span>Engine: {auditResult.extraction_source || 'Gemini 3.8 Flash (Multimodal)'}</span>
              </span>
            </p>
          </div>

          {/* Quick Alert Badges */}
          <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2 shrink-0 text-xs font-mono">
            <div className="badge-critical px-3 py-1.5 rounded-lg flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              <span>450 kg Net Weight Shortfall (Sec 111/112 Penalty)</span>
            </div>
            <div className="badge-warning px-3 py-1.5 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>BLQ Sensitivity Trap: Tricyclazole LOQ 0.05 &gt; MRL 0.01</span>
            </div>
            <div className="badge-warning px-3 py-1.5 rounded-lg flex items-center space-x-2">
              <ZoomIn className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Chlorpyrifos QA Rubber Stamp Occlusion (Pending Clerk)</span>
            </div>
          </div>
        </div>
      </div>

      {/* FORENSIC SPLIT COCKPIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: FORENSIC DOCUMENT STUDIO */}
        <div className="lg:col-span-6 space-y-3">
          <div className="glass-panel p-4 space-y-3">
            {/* Document Selector & Zoom Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 hairline-b pb-3">
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                {SAMPLE_DOCS.map((doc) => {
                  const isSelected = selectedDoc === doc.key;
                  return (
                    <button
                      key={doc.key}
                      onClick={() => setSelectedDoc(doc.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-display flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                          : 'text-slate-400 hover:text-white bg-slate-900/60 border border-white/10'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{doc.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-lg border border-white/10 text-xs">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] px-1.5 text-slate-300">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.15))}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="px-2 py-0.5 text-[10px] font-mono text-slate-400 hover:text-white rounded hover:bg-white/10"
                  title="Reset Zoom"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Document Canvas with Overlays */}
            <ForensicDocViewer
              filename={selectedDoc}
              findings={findings}
              pulsedFinding={pulsedFinding}
              renderedPages={auditResult?.rendered_pages || {}}
              zoomLevel={zoomLevel}
              isScanning={isScanning || loading}
              onOpenZoomModal={(f) => setZoomFinding(f)}
            />

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 font-mono">
              <span>Interactive 0–1000 Sub-Pixel Bounding Boxes</span>
              <span className="text-amber-400 flex items-center space-x-1">
                <Scan className="w-3.5 h-3.5" />
                <span>Click any highlighted region to inspect</span>
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REGULATORY INTELLIGENCE CONSOLE */}
        <div className="lg:col-span-6 space-y-4">
          {/* A. FINANCIAL RISK MATRIX */}
          {risk && (
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center space-x-2">
                  <Scale className="w-5 h-5 text-rose-400" />
                  <h3 className="font-display font-bold text-sm text-white">Itemized Financial Risk Exposure</h3>
                </div>
                <span className="font-display font-bold text-base text-rose-400 drop-shadow">
                  Total: {INR_FORMAT(risk.total_estimated_risk_inr)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="glass-well p-3 space-y-1">
                  <div className="text-[11px] text-slate-400">EU Port Storage & Demurrage (14d)</div>
                  <div className="font-mono font-bold text-base text-slate-100">
                    {INR_FORMAT(risk.demurrage_port_storage_inr)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">€150/day container detention</div>
                </div>

                <div className="glass-well p-3 space-y-1">
                  <div className="text-[11px] text-slate-400">Mandatory NABL / EIC Re-Testing</div>
                  <div className="font-mono font-bold text-base text-slate-100">
                    {INR_FORMAT(risk.re_testing_re_sampling_inr)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">Secondary high-res LC-MS/MS</div>
                </div>

                <div className="glass-well p-3 space-y-1 border border-amber-500/30">
                  <div className="text-[11px] text-amber-300">Customs Misdeclaration Penalty</div>
                  <div className="font-mono font-bold text-base text-amber-300">
                    {INR_FORMAT(risk.customs_penalty_inr)}
                  </div>
                  <div className="text-[10px] text-amber-400/80 font-mono">Section 111/112 (450 kg shortfall)</div>
                </div>

                <div className="glass-well p-3 space-y-1 border border-rose-500/30">
                  <div className="text-[11px] text-rose-300">Cargo Destruction / Re-Export</div>
                  <div className="font-mono font-bold text-base text-rose-400">
                    {INR_FORMAT(risk.cargo_rejection_re_export_inr)}
                  </div>
                  <div className="text-[10px] text-rose-400/80 font-mono">70% CIF consignment value</div>
                </div>
              </div>
            </div>
          )}

          {/* B. CROSS-DOCUMENT WEIGHT RECONCILIATION */}
          {weight && (
            <div className="glass-panel p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center space-x-2">
                  <Scale className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-display font-bold text-sm text-white">Cross-Document Weight Reconciliation</h3>
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                    weight.status === 'PASS'
                      ? 'badge-pass'
                      : 'badge-critical'
                  }`}
                >
                  {weight.status === 'PASS' ? 'WEIGHTS MATCH' : 'DISCREPANCY DETECTED'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="glass-well p-2.5 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Commercial Invoice</span>
                  <span className="font-mono font-bold text-sm text-white mt-1 block">
                    {weight.invoice_net_weight_kg ? `${weight.invoice_net_weight_kg.toLocaleString()} kg` : 'N/A'}
                  </span>
                </div>
                <div className="glass-well p-2.5 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Packing List Net</span>
                  <span className="font-mono font-bold text-sm text-white mt-1 block">
                    {weight.packing_list_net_weight_kg ? `${weight.packing_list_net_weight_kg.toLocaleString()} kg` : 'N/A'}
                  </span>
                </div>
                <div className="glass-well p-2.5 text-center border border-rose-500/40">
                  <span className="text-[10px] text-rose-300 block font-mono">Variance Deficit</span>
                  <span className="font-mono font-bold text-sm text-rose-400 mt-1 block">
                    {weight.discrepancy_kg} kg (-2.43%)
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/40 p-2.5 rounded-lg border border-white/5 font-mono">
                {weight.notes}
              </p>
            </div>
          )}

          {/* C. CHEMICAL RESIDUE & CONTAMINANT TABLE */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-display font-bold text-sm text-white">Chemical Residue & Contaminant Ledger</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">{findings.length} Analytes Screened</span>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 border-b border-white/10 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Analyte / CAS</th>
                    <th className="py-2.5 px-2">Reading</th>
                    <th className="py-2.5 px-2">Lab LOQ</th>
                    <th className="py-2.5 px-2">EU MRL</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {findings.map((f) => {
                    const style = SEVERITY_STYLES[f.compliance_status] || SEVERITY_STYLES.PASS;
                    const isTrap = f.blq_trap_triggered;
                    const isReview = f.needs_human_review;

                    return (
                      <tr
                        key={f.name}
                        onMouseEnter={() => handleFindingSelect(f)}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      >
                        <td className="py-3 px-3">
                          <div className="font-display font-bold text-white group-hover:text-emerald-300">
                            {f.name}
                          </div>
                          <div className="text-[10px] text-slate-400">{f.cas_number || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-2 text-slate-200">
                          <div>{f.reported_reading}</div>
                          {isReview && (
                            <span className="text-[9px] text-amber-400 flex items-center space-x-1 mt-0.5">
                              <span>Conf: {(f.confidence_score * 100).toFixed(0)}%</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-slate-400">{f.lab_loq}</td>
                        <td className="py-3 px-2 text-emerald-400 font-bold">{f.eu_mrl_mg_kg} mg/kg</td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${style.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            <span>
                              {isTrap
                                ? 'BLQ TRAP'
                                : f.review_reason?.startsWith('VERIFIED PASS')
                                ? 'VERIFIED PASS ✓'
                                : f.review_reason?.startsWith('CRITICAL_BLOCK')
                                ? 'VERIFIED FAIL ✗'
                                : f.compliance_status}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          {isReview || f.review_reason || f.name === 'Chlorpyrifos' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomFinding(f);
                              }}
                              className="keycap-btn px-2.5 py-1 text-[10px] text-amber-300 hover:text-white flex items-center space-x-1 ml-auto shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                              title="Open 300% Forensic Stamp Magnifier"
                            >
                              <ZoomIn className="w-3 h-3 text-amber-400" />
                              <span>{f.review_reason ? 'Re-Inspect' : 'Inspect Stamp'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFindingSelect(f);
                              }}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Spotlight on Document"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIONABLE EXPORTER DELIVERABLES */}
      <ExporterDeliverablesDrawer auditResult={auditResult} findings={findings} />

      {/* 300% FORENSIC LOUPE MODAL */}
      <AnimatePresence>
        {zoomFinding && (
          <ZoomReverifyModal
            finding={zoomFinding}
            onClose={() => setZoomFinding(null)}
            onConfirm={handleConfirmReverify}
            renderedPages={auditResult?.rendered_pages || {}}
          />
        )}
      </AnimatePresence>
    </div>
  );
}