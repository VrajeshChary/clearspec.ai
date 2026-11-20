import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  Anchor
} from 'lucide-react';
import { auditConsignment, reverifyAnalyte, generateVisualCard } from '../services/api';

const SAMPLE_DOCS = [
  { key: 'Commercial_Invoice_104.pdf', label: 'Commercial Invoice', badge: '18,500 kg Net' },
  { key: 'Packing_List_104.pdf', label: 'Packing List', badge: '18,050 kg Net (Discrepancy)' },
  { key: 'NABL_Lab_Report_104.pdf', label: 'NABL Lab Certificate', badge: 'LC-MS/MS + QA Stamp' },
];

const ANALYTE_DOC_MAP = {
  Tricyclazole: 'NABL_Lab_Report_104.pdf',
  'Aflatoxin B1': 'NABL_Lab_Report_104.pdf',
  Chlorpyrifos: 'NABL_Lab_Report_104.pdf',
};

const SEVERITY_STYLES = {
  CRITICAL_BLOCK: {
    badge: 'bg-red-950/80 text-red-300 border border-red-700/80',
    dot: 'bg-red-500',
    border: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.22)'
  },
  CRITICAL_FAIL_EXCEEDED: {
    badge: 'bg-red-950/80 text-red-300 border border-red-700/80',
    dot: 'bg-red-500',
    border: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.22)'
  },
  HUMAN_REVIEW_REQUIRED: {
    badge: 'bg-amber-950/80 text-amber-300 border border-amber-700/80',
    dot: 'bg-amber-400',
    border: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.25)'
  },
  PASS: {
    badge: 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/80',
    dot: 'bg-emerald-500',
    border: '#10b981',
    bg: 'rgba(16, 185, 129, 0.18)'
  },
};

const EU_CITATIONS = {
  Tricyclazole: 'Reg (EC) 396/2005, MRL 0.01 mg/kg (Chilli, dried)',
  'Aflatoxin B1': 'Reg (EU) 2023/915, MRL 5 µg/kg (Spices / Capsicum)',
  Chlorpyrifos: 'Reg (EU) 2020/1085, Banned in EU — MRL 0.01 mg/kg default',
};

const INR_FORMAT = (v) => '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// ─────────────────────────────────────────────────────────────────────────────
// Forensic PDF Page Viewer with Bounding-Box Overlay & Zoom Loupe
// ─────────────────────────────────────────────────────────────────────────────
function ForensicDocViewer({
  filename,
  findings,
  pulsedFinding,
  renderedPages = {},
  zoomLevel,
  onOpenZoomModal
}) {
  const [imgDims, setImgDims] = useState({ w: 1, h: 1 });
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
    <div className="relative overflow-auto max-h-[680px] rounded-lg border border-rule bg-paper-well p-2 flex items-center justify-center">
      <div
        className="relative inline-block transition-transform duration-150 origin-top-left"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        <img
          ref={imgRef}
          src={pageUrl}
          alt={filename}
          onLoad={onLoad}
          className="max-w-full rounded border border-rule shadow-lg block select-none"
        />

        {docFindings.map((f) => {
          const [ymin, xmin, ymax, xmax] = f.bounding_box;
          const top = `${(ymin / 1000) * 100}%`;
          const left = `${(xmin / 1000) * 100}%`;
          const width = `${((xmax - xmin) / 1000) * 100}%`;
          const height = `${((ymax - ymin) / 1000) * 100}%`;

          const isAmber = f.needs_human_review || f.compliance_status === 'HUMAN_REVIEW_REQUIRED';
          const isCritical = f.compliance_status?.includes('CRITICAL');
          const borderColor = isCritical ? '#ef4444' : isAmber ? '#f59e0b' : '#10b981';
          const bgColor = isCritical
            ? 'rgba(239, 68, 68, 0.25)'
            : isAmber
            ? 'rgba(245, 158, 11, 0.28)'
            : 'rgba(16, 185, 129, 0.18)';
          const isPulsed = pulsedFinding?.name === f.name;

          return (
            <div
              key={f.name}
              title={`${f.name}: Click to inspect`}
              onClick={() => onOpenZoomModal(f)}
              style={{
                position: 'absolute',
                top,
                left,
                width,
                height,
                border: `2px solid ${borderColor}`,
                backgroundColor: bgColor,
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: isPulsed ? `0 0 0 4px ${borderColor}` : 'none',
                animation: isPulsed ? 'pulse-laser 1s ease-in-out 3' : 'none',
              }}
              className="group hover:ring-2 hover:ring-white/80 transition-colors"
            >
              <div
                style={{ backgroundColor: borderColor }}
                className="absolute -top-5 left-0 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold text-white whitespace-nowrap shadow pointer-events-none"
              >
                {f.name}
                {f.blq_trap_triggered && ' [BLQ TRAP]'}
                {isAmber && ' [QA STAMP OCCLUDED]'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 300% Zoom Loupe / Forensic Clerk Verification Modal
// ─────────────────────────────────────────────────────────────────────────────
function ZoomReverifyModal({ finding, onClose, onConfirm, renderedPages }) {
  const [confirmedVal, setConfirmedVal] = useState('0.008');
  const [unit, setUnit] = useState('mg/kg');
  const [submitting, setSubmitting] = useState(false);

  if (!finding) return null;

  const docKey = finding.document_filename || ANALYTE_DOC_MAP[finding.name] || 'NABL_Lab_Report_104.pdf';
  const pageUrl = renderedPages[docKey] || `/api/v1/sample-pdf/${encodeURIComponent(docKey)}/page/0.png`;

  const bbox = finding.bounding_box || [500, 300, 540, 700];
  const [ymin, xmin, ymax, xmax] = bbox;

  // Zoom center percentages
  const cy = ((ymin + ymax) / 20) || 50;
  const cx = ((xmin + xmax) / 20) || 50;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onConfirm(finding, parseFloat(confirmedVal));
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="reg-card w-full max-w-2xl bg-paper-2 border-rule-strong shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 hairline-b bg-paper-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ZoomIn className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-white">
                300% Forensic Loupe — Human Clerk Re-Verification
              </h3>
              <p className="text-[11px] text-muted">
                Resolving physical rubber stamp occlusion on {finding.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-white hover:bg-paper-well">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loupe Viewport */}
        <div className="p-5 space-y-4">
          <div className="text-xs text-ink-2 bg-amber-950/40 border border-amber-800/60 p-3 rounded-lg flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">
                Optical QA Occlusion Detected (Confidence: {(finding.confidence_score * 100).toFixed(0)}% &lt; 85%)
              </p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Physical red inspection stamp covers the numerical digits for {finding.name}. Please confirm the true reading under high magnification below.
              </p>
            </div>
          </div>

          {/* Magnified Image Cropper */}
          <div className="relative h-64 w-full rounded-lg border-2 border-emerald-500/40 overflow-hidden bg-black flex items-center justify-center shadow-inner">
            <img
              src={pageUrl}
              alt="Magnified reading"
              className="absolute max-w-none select-none transition-transform"
              style={{
                width: '320%',
                top: `${-cy * 2.8 + 80}px`,
                left: `${-cx * 2.8 + 140}px`,
                filter: 'contrast(1.2) brightness(1.05)',
              }}
            />
            {/* Crosshair Target Reticle */}
            <div className="absolute inset-0 pointer-events-none border border-emerald-400/30 flex items-center justify-center">
              <div className="w-48 h-20 border-2 border-dashed border-amber-400/80 bg-amber-500/10 rounded flex items-center justify-center">
                <span className="text-[10px] font-mono text-amber-300 bg-black/60 px-2 py-0.5 rounded">
                  300% Forensic Inspection Reticle
                </span>
              </div>
            </div>
          </div>

          {/* Form Confirmation */}
          <form onSubmit={handleSubmit} className="bg-paper-well p-4 rounded-lg border border-rule space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-muted text-[11px] mb-1">Extracted Reading (Occluded)</label>
                <div className="font-mono text-ink-2 bg-paper-3 p-2 rounded border border-rule">
                  {finding.reported_reading} (Confidence: {(finding.confidence_score * 100).toFixed(0)}%)
                </div>
              </div>
              <div>
                <label className="block text-muted text-[11px] mb-1">Statutory EU MRL Ceiling</label>
                <div className="font-mono text-emerald-400 bg-paper-3 p-2 rounded border border-rule">
                  {finding.eu_mrl_mg_kg} mg/kg
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                Enter Verified Numerical Reading from Lab Certificate:
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={confirmedVal}
                  onChange={(e) => setConfirmedVal(e.target.value)}
                  className="flex-1 bg-paper-3 border border-rule-strong rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="0.008"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="bg-paper-3 border border-rule-strong rounded px-3 py-2 text-xs text-white"
                >
                  <option value="mg/kg">mg/kg</option>
                  <option value="ug/kg">ug/kg</option>
                  <option value="ppm">ppm</option>
                </select>
              </div>
              <p className="text-[11px] text-muted mt-1">
                Submitting will verify against the statutory SQLite database and immediately update risk calculations.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded text-xs text-muted hover:text-white hover:bg-paper-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="keycap-btn keycap-btn-primary px-4 py-2 text-xs font-semibold flex items-center space-x-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm Clerk Verification</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Actionable Exporter Deliverables: Bilingual Notice & 16:9 WhatsApp Visual Card
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
        batch_id: auditResult?.consignment_batch || 'GNT-24A',
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
    <div className="reg-card p-5 space-y-4">
      <div className="flex items-center justify-between hairline-b pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm text-white">Actionable Exporter Deliverables</h3>
            <p className="text-[11px] text-muted">Statutory notices and WhatsApp badges for suppliers and logistics teams</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-paper-well p-1 rounded-lg border border-rule">
          <button
            onClick={() => setActiveSubTab('bilingual')}
            className={`px-3 py-1 rounded text-xs font-display transition-colors ${
              activeSubTab === 'bilingual' ? 'bg-emerald-600 text-white font-semibold' : 'text-muted hover:text-white'
            }`}
          >
            Bilingual Notice (EN/TE)
          </button>
          <button
            onClick={() => {
              setActiveSubTab('whatsapp-card');
              if (!visualCard) handleGenerateCard();
            }}
            className={`px-3 py-1 rounded text-xs font-display transition-colors ${
              activeSubTab === 'whatsapp-card' ? 'bg-emerald-600 text-white font-semibold' : 'text-muted hover:text-white'
            }`}
          >
            16:9 WhatsApp Fix Card
          </button>
        </div>
      </div>

      {activeSubTab === 'bilingual' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 bg-paper-3 p-1 rounded border border-rule">
              <button
                onClick={() => setNoticeLang('en')}
                className={`px-2.5 py-0.5 rounded text-xs ${
                  noticeLang === 'en' ? 'bg-emerald-600 text-white font-semibold' : 'text-muted hover:text-white'
                }`}
              >
                English Notice
              </button>
              <button
                onClick={() => setNoticeLang('te')}
                className={`px-2.5 py-0.5 rounded text-xs ${
                  noticeLang === 'te' ? 'bg-emerald-600 text-white font-semibold' : 'text-muted hover:text-white'
                }`}
              >
                తెలుగు నోటీసు (Telugu)
              </button>
            </div>

            <button
              onClick={handleCopyNotice}
              className="keycap-btn px-3 py-1 text-xs flex items-center space-x-1.5"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Official Notice'}</span>
            </button>
          </div>

          <div className="bg-paper-well p-4 rounded-lg border border-rule font-mono text-xs leading-relaxed text-ink-2 whitespace-pre-wrap max-h-56 overflow-y-auto">
            {noticeLang === 'te'
              ? auditResult?.bilingual_supplier_notice?.telugu_notice
              : auditResult?.bilingual_supplier_notice?.english_notice}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">High-DPI WhatsApp-Ready Visual Card (Generated via Nano Banana 2.1)</span>
            <button
              onClick={handleGenerateCard}
              disabled={generatingCard}
              className="keycap-btn px-3 py-1 text-xs flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generatingCard ? 'animate-spin' : ''}`} />
              <span>Regenerate Card</span>
            </button>
          </div>

          {generatingCard ? (
            <div className="h-64 rounded-lg border border-rule bg-paper-well flex flex-col items-center justify-center space-y-2 text-muted text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Rendering 16:9 defect graphic card...</span>
            </div>
          ) : visualCard?.image_base64 ? (
            <div className="relative rounded-lg overflow-hidden border border-rule shadow-xl bg-black">
              <img
                src={`data:image/png;base64,${visualCard.image_base64}`}
                alt="WhatsApp Visual Fix Card"
                className="w-full object-contain max-h-80"
              />
              <div className="p-3 bg-paper-3 hairline-t flex items-center justify-between text-xs">
                <span className="text-muted font-mono text-[11px]">
                  Format: 16:9 PNG • Model: {visualCard.model_used}
                </span>
                <a
                  href={`data:image/png;base64,${visualCard.image_base64}`}
                  download={`ClearSpec_DefectCard_${auditResult?.consignment_batch || 'GNT-24A'}.png`}
                  className="keycap-btn keycap-btn-primary px-3 py-1 text-xs font-semibold flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="h-48 rounded-lg border border-dashed border-rule bg-paper-well flex flex-col items-center justify-center space-y-2 text-muted text-xs">
              <AlertCircle className="w-6 h-6 text-muted" />
              <span>Click Regenerate to create the WhatsApp card.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Consignment Auditor Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ConsignmentAuditTab({ onAuditLoaded }) {
  const [auditResult, setAuditResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState('NABL_Lab_Report_104.pdf');
  const [pulsedFinding, setPulsedFinding] = useState(null);
  const [zoomFinding, setZoomFinding] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeScenario, setActiveScenario] = useState('rotterdam');

  // Run audit on mount with sample packet
  useEffect(() => {
    executeAudit({ use_sample: true });
  }, []);

  const executeAudit = useCallback(async (payload, isForm = false) => {
    setLoading(true);
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
    }
  }, []);

  const handleScenarioSelect = (scenario) => {
    setActiveScenario(scenario);
    if (scenario === 'rotterdam') {
      executeAudit({ use_sample: true });
    }
  };

  const handleFilesUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    setActiveScenario('custom');
    executeAudit(form, true);
  };

  const handleFindingSelect = (finding) => {
    const doc = finding.document_filename || ANALYTE_DOC_MAP[finding.name] || 'NABL_Lab_Report_104.pdf';
    setSelectedDoc(doc);
    setPulsedFinding(finding);
    setTimeout(() => setPulsedFinding(null), 2500);
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

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────────────────
          1. BENCHMARK SELECTOR STRIP (Zero-friction 1-Click Scenarios)
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="reg-card p-3 bg-paper-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-display font-semibold text-muted uppercase tracking-wider">
            Benchmark Scenario:
          </span>
          <div className="flex items-center space-x-1.5 bg-paper-well p-1 rounded-lg border border-rule">
            <button
              onClick={() => handleScenarioSelect('rotterdam')}
              className={`px-3 py-1.5 rounded-md text-xs font-display flex items-center space-x-1.5 transition-colors ${
                activeScenario === 'rotterdam'
                  ? 'bg-red-950 text-red-200 border border-red-700/80 font-semibold shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Packet A: Rotterdam Red Alert (GNT-24A)</span>
            </button>
          </div>
        </div>

        {/* Custom Upload Trigger */}
        <label className="keycap-btn px-3 py-1.5 text-xs font-display flex items-center space-x-1.5 cursor-pointer">
          <Upload className="w-3.5 h-3.5 text-muted" />
          <span>Upload Custom PDF Packet</span>
          <input type="file" multiple accept=".pdf" onChange={handleFilesUpload} className="hidden" />
        </label>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          2. EXECUTIVE HERO STATUS RIBBON
      ───────────────────────────────────────────────────────────────────────── */}
      {auditResult && (
        <div className="reg-card p-5 bg-gradient-to-r from-red-950/40 via-paper-2 to-paper-3 border-red-900/60 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2.5">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-wide bg-red-900/80 text-red-200 border border-red-600 flex items-center space-x-1.5 shadow-md">
                  <ShieldX className="w-4 h-4 text-red-400" />
                  <span>EXPORT HOLD: {overallStatus}</span>
                </span>
                <span className="font-mono text-xs text-muted">
                  Batch: <strong className="text-white font-bold">{auditResult.consignment_batch}</strong>
                </span>
                <span className="text-muted text-xs">&bull;</span>
                <span className="font-mono text-xs text-muted">
                  ITC-HS: <strong className="text-emerald-400">{auditResult.declared_hs_code}</strong> (Chapter {auditResult.normalized_hs_prefix})
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Indian Crushed Chilli &rarr; Port of Rotterdam, Netherlands</span>
              </h2>

              <p className="text-xs text-muted flex items-center space-x-3">
                <span>Prevented Regulatory Seizure Liability:</span>
                <span className="font-display font-bold text-base text-red-400 tracking-tight">
                  {INR_FORMAT(risk?.total_estimated_risk_inr || 5246000)} INR
                </span>
                <span className="text-muted/60">|</span>
                <span className="text-[11px] text-emerald-300 font-mono">
                  Engine: {auditResult.extraction_source || 'Gemini 3.8 Flash (Multimodal)'}
                </span>
              </p>
            </div>

            {/* Quick Alert Badges */}
            <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-1.5 shrink-0 text-xs">
              <div className="px-2.5 py-1 rounded bg-red-950/70 border border-red-800 text-red-300 flex items-center space-x-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                <span>450 kg Net Weight Shortfall (Sec 111/112 Penalty)</span>
              </div>
              <div className="px-2.5 py-1 rounded bg-amber-950/70 border border-amber-800 text-amber-300 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>BLQ Sensitivity Trap: Tricyclazole LOQ 0.05 &gt; MRL 0.01</span>
              </div>
              <div className="px-2.5 py-1 rounded bg-amber-950/70 border border-amber-800 text-amber-300 flex items-center space-x-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                <span>Chlorpyrifos QA Stamp Occlusion (Requires Review)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          3. FORENSIC SPLIT COCKPIT (Left: Document Viewer | Right: Intelligence)
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: FORENSIC DOCUMENT VIEWER (Cols 1-6) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="reg-card p-4 space-y-3">
            {/* Document Selector & Zoom Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 hairline-b pb-3">
              <div className="flex items-center space-x-1 overflow-x-auto">
                {SAMPLE_DOCS.map((doc) => {
                  const isSelected = selectedDoc === doc.key;
                  return (
                    <button
                      key={doc.key}
                      onClick={() => setSelectedDoc(doc.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-display flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                          : 'text-muted hover:text-white hover:bg-paper-well'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{doc.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center space-x-1 bg-paper-well p-1 rounded-lg border border-rule">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
                  className="p-1 text-muted hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono px-1.5 text-ink-2">
                  {(zoomLevel * 100).toFixed(0)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.15))}
                  className="p-1 text-muted hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="px-1.5 py-0.5 text-[10px] text-muted hover:text-white rounded hover:bg-paper-3"
                  title="Reset Zoom"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Document Canvas with Overlays */}
            {loading ? (
              <div className="h-96 rounded-lg border border-rule bg-paper-well flex flex-col items-center justify-center space-y-3 text-muted text-xs">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                <span className="font-mono">Analyzing 2x DPI documents via Gemini 3.8 Flash...</span>
              </div>
            ) : (
              <ForensicDocViewer
                filename={selectedDoc}
                findings={findings}
                pulsedFinding={pulsedFinding}
                renderedPages={auditResult?.rendered_pages || {}}
                zoomLevel={zoomLevel}
                onOpenZoomModal={(f) => setZoomFinding(f)}
              />
            )}

            <div className="text-[11px] text-muted flex items-center justify-between pt-1">
              <span>Interactive 0-1000 normalized bounding box coordinates overlay</span>
              <span className="text-amber-400 font-mono">Click any highlighted box to inspect</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REGULATORY INTELLIGENCE CONSOLE (Cols 7-12) */}
        <div className="lg:col-span-6 space-y-4">
          {/* A. FINANCIAL RISK MATRIX */}
          {risk && (
            <div className="reg-card p-4 space-y-3">
              <div className="flex items-center justify-between hairline-b pb-2">
                <div className="flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-red-400" />
                  <h3 className="font-display font-semibold text-sm text-white">Itemized Financial Risk Exposure</h3>
                </div>
                <span className="font-display font-bold text-sm text-red-400">
                  Total: {INR_FORMAT(risk.total_estimated_risk_inr)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-paper-well p-2.5 rounded border border-rule">
                  <div className="text-[11px] text-muted">Rotterdam Port Demurrage (14d)</div>
                  <div className="font-mono font-bold text-sm text-ink-2 mt-0.5">
                    {INR_FORMAT(risk.demurrage_port_storage_inr)}
                  </div>
                  <div className="text-[10px] text-muted/80">€150/day container detention</div>
                </div>

                <div className="bg-paper-well p-2.5 rounded border border-rule">
                  <div className="text-[11px] text-muted">Mandatory NABL / EIC Re-Testing</div>
                  <div className="font-mono font-bold text-sm text-ink-2 mt-0.5">
                    {INR_FORMAT(risk.re_testing_re_sampling_inr)}
                  </div>
                  <div className="text-[10px] text-muted/80">Secondary high-res LC-MS/MS</div>
                </div>

                <div className="bg-paper-well p-2.5 rounded border border-rule">
                  <div className="text-[11px] text-muted">Customs Misdeclaration Penalty</div>
                  <div className="font-mono font-bold text-sm text-amber-300 mt-0.5">
                    {INR_FORMAT(risk.customs_penalty_inr)}
                  </div>
                  <div className="text-[10px] text-amber-400/80">Section 111/112 Customs Act (450kg shortfall)</div>
                </div>

                <div className="bg-paper-well p-2.5 rounded border border-rule">
                  <div className="text-[11px] text-muted">Cargo Rejection / Destruction Liability</div>
                  <div className="font-mono font-bold text-sm text-red-400 mt-0.5">
                    {INR_FORMAT(risk.cargo_rejection_re_export_inr)}
                  </div>
                  <div className="text-[10px] text-red-400/80">70% CIF consignment value</div>
                </div>
              </div>
            </div>
          )}

          {/* B. WEIGHT RECONCILIATION */}
          {weight && (
            <div className="reg-card p-4 space-y-2">
              <div className="flex items-center justify-between hairline-b pb-2">
                <div className="flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-display font-semibold text-sm text-white">Cross-Document Weight Reconciliation</h3>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                    weight.status === 'PASS'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-red-950 text-red-300 border border-red-700'
                  }`}
                >
                  {weight.status === 'PASS' ? 'WEIGHTS MATCH' : 'DISCREPANCY DETECTED'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-paper-well p-2 rounded border border-rule">
                  <span className="text-[10px] text-muted block">Commercial Invoice</span>
                  <span className="font-mono font-bold text-ink">
                    {weight.invoice_net_weight_kg ? `${weight.invoice_net_weight_kg.toLocaleString()} kg` : 'N/A'}
                  </span>
                </div>
                <div className="bg-paper-well p-2 rounded border border-rule">
                  <span className="text-[10px] text-muted block">Packing List Net</span>
                  <span className="font-mono font-bold text-ink">
                    {weight.packing_list_net_weight_kg ? `${weight.packing_list_net_weight_kg.toLocaleString()} kg` : 'N/A'}
                  </span>
                </div>
                <div className="bg-paper-well p-2 rounded border border-rule">
                  <span className="text-[10px] text-muted block">Variance</span>
                  <span className="font-mono font-bold text-red-400">
                    {weight.discrepancy_kg} kg (-2.43%)
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted leading-relaxed">
                {weight.notes}
              </p>
            </div>
          )}

          {/* C. CHEMICAL RESIDUE & CONTAMINANT TABLE */}
          <div className="reg-card p-4 space-y-3">
            <div className="flex items-center justify-between hairline-b pb-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-display font-semibold text-sm text-white">Chemical Residue & Contaminant Ledger</h3>
              </div>
              <span className="text-[11px] text-muted font-mono">{findings.length} Analytes Screened</span>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs font-body">
                <thead className="bg-paper-well text-muted text-[11px] uppercase tracking-wider sticky top-0 hairline-b">
                  <tr>
                    <th className="py-2 px-2.5">Analyte / CAS</th>
                    <th className="py-2 px-2">Reading</th>
                    <th className="py-2 px-2">Lab LOQ</th>
                    <th className="py-2 px-2">EU MRL</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule font-mono">
                  {findings.map((f) => {
                    const style = SEVERITY_STYLES[f.compliance_status] || SEVERITY_STYLES.PASS;
                    const isTrap = f.blq_trap_triggered;
                    const isReview = f.needs_human_review;

                    return (
                      <tr
                        key={f.name}
                        onMouseEnter={() => handleFindingSelect(f)}
                        className="hover:bg-paper-3 transition-colors group cursor-pointer"
                      >
                        <td className="py-2.5 px-2.5">
                          <div className="font-display font-semibold text-white group-hover:text-emerald-300">
                            {f.name}
                          </div>
                          <div className="text-[10px] text-muted">{f.cas_number || 'N/A'}</div>
                        </td>
                        <td className="py-2.5 px-2 text-ink-2">
                          <div>{f.reported_reading}</div>
                          {isReview && (
                            <span className="text-[9px] text-amber-400 flex items-center space-x-1 mt-0.5">
                              <span>Conf: {(f.confidence_score * 100).toFixed(0)}%</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-muted">{f.lab_loq}</td>
                        <td className="py-2.5 px-2 text-emerald-400 font-bold">{f.eu_mrl_mg_kg} mg/kg</td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${style.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            <span>{isTrap ? 'BLQ TRAP' : f.compliance_status}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {isReview ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomFinding(f);
                              }}
                              className="keycap-btn px-2 py-1 text-[10px] text-amber-300 hover:text-white flex items-center space-x-1 ml-auto"
                            >
                              <ZoomIn className="w-3 h-3 text-amber-400" />
                              <span>Inspect Stamp</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFindingSelect(f);
                              }}
                              className="p-1 text-muted hover:text-white"
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

            <div className="text-[11px] text-muted hairline-t pt-2">
              <span className="font-semibold text-amber-400">Notice on BLQ Trap:</span> If a lab reports BLQ but the lab's instrument LOQ is greater than the EU statutory MRL, the test fails compliance under EU import regulations.
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          4. ACTIONABLE EXPORTER DELIVERABLES (Bilingual Notice & WhatsApp Card)
      ───────────────────────────────────────────────────────────────────────── */}
      {auditResult && <ExporterDeliverablesDrawer auditResult={auditResult} findings={findings} />}

      {/* ───────────────────────────────────────────────────────────────────────
          5. 300% ZOOM RE-VERIFICATION MODAL
      ───────────────────────────────────────────────────────────────────────── */}
      <ZoomReverifyModal
        finding={zoomFinding}
        onClose={() => setZoomFinding(null)}
        onConfirm={handleConfirmReverify}
        renderedPages={auditResult?.rendered_pages || {}}
      />
    </div>
  );
}
