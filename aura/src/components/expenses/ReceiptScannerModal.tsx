import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Users, 
  DollarSign, 
  Percent, 
  FileText, 
  Sparkles, 
  Receipt, 
  Divide,
  Eye,
  FileCode,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { tabsApi, type Contact } from '../../lib/tabsApi';
import { supabase } from '../../lib/supabase';
import { 
  type ParsedReceipt, 
  type ReceiptItem, 
  SAMPLE_RECEIPTS, 
  parseReceiptText 
} from '../../lib/receiptParser';
import { preprocessImageForOcr } from '../../lib/imagePreprocessor';
import Tesseract from 'tesseract.js';

interface ReceiptScannerModalProps {
  onClose: () => void;
  onReceiptProcessed?: (receipt: ParsedReceipt) => void;
}

export function ReceiptScannerModal({ onClose, onReceiptProcessed }: ReceiptScannerModalProps) {
  const { getAuraColor } = useTheme();
  const auraColor = getAuraColor();
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Camera & Viewfinder State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');

  // Parsing & Receipt State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusMessage, setScanStatusMessage] = useState('Initializing OCR Engine...');
  const [scannedReceipt, setScannedReceipt] = useState<ParsedReceipt | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [showRawTextDrawer, setShowRawTextDrawer] = useState(false);
  const [manualTextToParse, setManualTextToParse] = useState('');
  const [step, setStep] = useState<'upload' | 'review'>('upload');

  // Friends & Split State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [enableSplit, setEnableSplit] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<'equal' | 'percentage' | 'custom'>('equal');
  const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Load Contacts
  useEffect(() => {
    tabsApi.getContacts().then((data) => {
      setContacts(data);
    });
    return () => {
      stopCameraStream();
    };
  }, []);

  // Stop Camera Stream Helper
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start Live Back Camera Viewfinder
  const startLiveCamera = async (facing: 'environment' | 'user' = 'environment') => {
    stopCameraStream();
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Direct back-camera stream failed, falling back to native file capture:', err);
      setIsCameraActive(false);
      fileInputRef.current?.click();
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startLiveCamera(nextFacing);
  };

  // Shutter Snapshot from Viewfinder
  const captureFrameFromCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      stopCameraStream();
      await processImageWithOcr(dataUrl);
    }
  };

  // Process any image dataURL with Contrast Enhancement + Tesseract OCR
  const processImageWithOcr = async (rawImageUrl: string) => {
    setIsScanning(true);
    setScanProgress(10);
    setScanStatusMessage('Enhancing image contrast & text clarity...');
    setReceiptImage(rawImageUrl);

    try {
      // 1. Image Preprocessing (Grayscale + Adaptive Contrast Boost)
      const preprocessed = await preprocessImageForOcr(rawImageUrl);

      setScanProgress(25);
      setScanStatusMessage('Reading store name, line items & prices...');

      // 2. Execute Tesseract OCR with Column-Aware PSM 6
      const { data: { text } } = await Tesseract.recognize(
        preprocessed,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const pct = Math.round((m.progress || 0) * 100);
              setScanProgress(Math.max(25, pct));
              setScanStatusMessage(`Scanning items & totals (${pct}%)...`);
            }
          },
          // @ts-ignore
          tessedit_pageseg_mode: '6', // Assume a single uniform block of columnar text
          preserve_interword_spaces: '1',
        }
      );

      setRawOcrText(text);

      // 3. Parse with enhanced Canadian regex engine
      const parsed = parseReceiptText(text);
      parsed.imageUrl = rawImageUrl;

      setScannedReceipt(parsed);
      setIsScanning(false);
      setStep('review');
    } catch (err: any) {
      console.error('OCR scan error:', err);
      const fallbackParsed = parseReceiptText('Store Receipt');
      fallbackParsed.imageUrl = rawImageUrl;
      setScannedReceipt(fallbackParsed);
      setIsScanning(false);
      setStep('review');
    }
  };

  // Handle Gallery / File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await processImageWithOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleParseManualText = () => {
    if (!manualTextToParse.trim()) return;
    const parsed = parseReceiptText(manualTextToParse);
    setRawOcrText(manualTextToParse);
    setScannedReceipt(parsed);
    setStep('review');
  };

  const handleSelectSample = (sampleKey: string) => {
    const sample = SAMPLE_RECEIPTS[sampleKey];
    if (sample) {
      setScannedReceipt({ ...sample });
      setRawOcrText(sample.items.map(i => `${i.name} $${i.price}`).join('\n'));
      setStep('review');
    }
  };

  // Line Item Management
  const handleItemChange = (id: string, field: keyof ReceiptItem, value: any) => {
    if (!scannedReceipt) return;
    const updatedItems = scannedReceipt.items.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });

    const newSubtotal = updatedItems.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
    const newTotal = Number((newSubtotal + Number(scannedReceipt.tax || 0) + Number(scannedReceipt.tip || 0)).toFixed(2));

    setScannedReceipt({
      ...scannedReceipt,
      items: updatedItems,
      subtotal: Number(newSubtotal.toFixed(2)),
      total: newTotal,
    });
  };

  const handleAddItem = () => {
    if (!scannedReceipt) return;
    const newItem: ReceiptItem = {
      id: `item-new-${Date.now()}`,
      name: 'New Item',
      price: 0,
      quantity: 1,
    };
    setScannedReceipt({
      ...scannedReceipt,
      items: [...scannedReceipt.items, newItem],
    });
  };

  const handleDeleteItem = (id: string) => {
    if (!scannedReceipt) return;
    const filtered = scannedReceipt.items.filter(i => i.id !== id);
    const newSubtotal = filtered.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
    const newTotal = Number((newSubtotal + Number(scannedReceipt.tax || 0) + Number(scannedReceipt.tip || 0)).toFixed(2));

    setScannedReceipt({
      ...scannedReceipt,
      items: filtered,
      subtotal: Number(newSubtotal.toFixed(2)),
      total: newTotal,
    });
  };

  // Friend Selection
  const toggleFriend = (id: string) => {
    if (selectedFriendIds.includes(id)) {
      setSelectedFriendIds(selectedFriendIds.filter(fId => fId !== id));
    } else {
      setSelectedFriendIds([...selectedFriendIds, id]);
    }
  };

  // Split Calculations
  const totalAmount = scannedReceipt?.total || 0;
  const totalParticipants = selectedFriendIds.length + 1;

  const equalSplitAmount = totalParticipants > 0 ? Number((totalAmount / totalParticipants).toFixed(2)) : 0;
  const sumOfPercentages = Object.values(customPercentages).reduce((s, p) => s + (Number(p) || 0), 0);
  const myPercentage = Math.max(0, 100 - sumOfPercentages);

  const sumOfCustomAmounts = Object.values(customAmounts).reduce((s, a) => s + (Number(a) || 0), 0);
  const remainingUnallocated = Number((totalAmount - sumOfCustomAmounts).toFixed(2));

  // Save to Ledger & Tabs
  const handleSaveAndSplit = async () => {
    if (!scannedReceipt || !user?.id) return;
    setIsSubmitting(true);

    try {
      const txPayload = {
        user_id: user.id,
        description: `${scannedReceipt.merchant} (Receipt Scan)`,
        amount: scannedReceipt.total,
        category: scannedReceipt.category || 'Groceries',
        currency: scannedReceipt.currency || 'CAD',
        payment_method: 'Receipt OCR / Card',
        date: scannedReceipt.date || new Date().toISOString().split('T')[0],
        notes: `Scanned ${scannedReceipt.items.length} items (Subtotal: $${scannedReceipt.subtotal}, Tax: $${scannedReceipt.tax}, Tip: $${scannedReceipt.tip})`,
        created_at: new Date().toISOString(),
      };

      await supabase.from('transactions').insert(txPayload);

      if (enableSplit && selectedFriendIds.length > 0) {
        const participantPayloads = selectedFriendIds.map((contactId) => {
          const friend = contacts.find(c => c.id === contactId);
          let share = equalSplitAmount;
          if (splitMode === 'percentage') {
            const pct = customPercentages[contactId] || (100 / totalParticipants);
            share = Number(((totalAmount * pct) / 100).toFixed(2));
          } else if (splitMode === 'custom') {
            share = customAmounts[contactId] || 0;
          }
          return { contactId, name: friend?.name || 'Friend', shareAmount: share };
        });

        await tabsApi.createSplitBill({
          title: `${scannedReceipt.merchant} (${scannedReceipt.items.length} items)`,
          totalAmount: scannedReceipt.total,
          category: scannedReceipt.category,
          date: scannedReceipt.date,
          participants: participantPayloads,
        });
      }

      if (onReceiptProcessed) {
        onReceiptProcessed(scannedReceipt);
      }

      setSuccessToast(true);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Failed to save scanned bill:', err);
      alert(err.message || 'Failed to process receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl max-h-[94vh] flex flex-col rounded-3xl bg-[#080808] border border-zinc-800 shadow-2xl relative overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="h-1 w-full flex-shrink-0"
          style={{ background: `linear-gradient(90deg, ${auraColor}, #00f2fe)` }}
        />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex justify-between items-center flex-shrink-0 bg-[#080808]">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
            >
              <Receipt size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Receipt Scanner & Splitter</h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Enhanced OCR
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                Auto-detects Shoppers, Walmart, Costco, grocery items, taxes, and totals
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {successToast ? (
            <div className="py-16 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-2xl">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">Receipt Processed & Logged!</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Transaction saved to your Ledger and IOUs posted to your Tabs roommates.
              </p>
            </div>
          ) : step === 'upload' ? (
            <div className="space-y-5">
              {/* LIVE REAR CAMERA VIEWFINDER */}
              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-cyan-500 shadow-2xl animate-in zoom-in-95">
                  <video 
                    ref={videoRef} 
                    playsInline 
                    autoPlay 
                    muted 
                    className="w-full h-[320px] sm:h-[380px] object-cover"
                  />

                  {/* Alignment Reticle Overlay */}
                  <div className="absolute inset-4 border-2 border-dashed border-cyan-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                    <span className="text-[10px] uppercase font-bold text-cyan-300 bg-black/60 px-2 py-0.5 rounded self-start">
                      Align Receipt Within Box
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 bg-black/60 px-2 py-0.5 rounded self-end">
                      Rear Camera Active (HD)
                    </span>
                  </div>

                  {/* Camera Controls Bar */}
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6 px-4">
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="p-3 rounded-full bg-black/70 hover:bg-black text-white border border-zinc-700 shadow-lg cursor-pointer"
                      title="Flip Camera"
                    >
                      <RefreshCw size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={captureFrameFromCamera}
                      className="px-6 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm shadow-2xl flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
                    >
                      <Camera size={18} />
                      <span>Capture & Scan</span>
                    </button>

                    <button
                      type="button"
                      onClick={stopCameraStream}
                      className="p-3 rounded-full bg-black/70 hover:bg-black text-rose-400 border border-zinc-700 shadow-lg cursor-pointer"
                      title="Close Camera"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Capture Option Cards */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Live Back Camera Launcher */}
                  <div 
                    onClick={() => startLiveCamera('environment')}
                    className="p-5 rounded-2xl bg-[#000000] border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-950/20 transition-all cursor-pointer text-center space-y-2.5 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Camera size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                        📸 Open Back Camera Viewfinder
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Launches rear camera with auto-focus & capture guide</p>
                    </div>
                  </div>

                  {/* Photo / PDF File Picker */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-2xl bg-[#000000] border-2 border-dashed border-zinc-800 hover:border-purple-500/80 hover:bg-purple-950/20 transition-all cursor-pointer text-center space-y-2.5 group"
                  >
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*,application/pdf" 
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden" 
                    />
                    <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <UploadCloud size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                        📁 Upload Photo or PDF Receipt
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Pick existing picture from gallery or files</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Indicator */}
              {isScanning && (
                <div className="p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-center space-y-3 animate-in fade-in">
                  <div className="w-9 h-9 rounded-full border-3 border-cyan-400 border-t-transparent animate-spin mx-auto" />
                  <div>
                    <b className="text-sm text-cyan-300 block">{scanStatusMessage}</b>
                    <span className="text-[11px] font-mono text-zinc-400">High-Contrast Neural OCR ({scanProgress}%)</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-700 max-w-md mx-auto">
                    <div 
                      className="bg-cyan-400 h-full transition-all duration-300 rounded-full" 
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Raw Text Manual Input */}
              <div className="p-3.5 rounded-2xl bg-[#000000] border border-zinc-800 space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode size={13} className="text-cyan-400" />
                  <span>Or Paste E-Bill / Receipt Text Directly</span>
                </span>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    placeholder="Shoppers Drug Mart\nTylenol $12.99\nToothpaste $4.49\nTotal $17.48"
                    value={manualTextToParse}
                    onChange={(e) => setManualTextToParse(e.target.value)}
                    className="flex-1 bg-[#080808] border border-zinc-800 rounded-xl p-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleParseManualText}
                    disabled={!manualTextToParse.trim()}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-cyan-300 cursor-pointer disabled:opacity-40 self-end"
                  >
                    Parse
                  </button>
                </div>
              </div>

              {/* 1-Click Demo Presets */}
              <div className="p-3.5 rounded-2xl bg-[#000000] border border-zinc-800 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <Sparkles size={13} className="text-cyan-400" />
                  <span>Instant Canadian Test Receipts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectSample('shoppers_drug_mart')}
                    className="p-2.5 rounded-xl bg-[#080808] border border-zinc-800 hover:border-emerald-500/60 text-left text-xs cursor-pointer transition-all"
                  >
                    <b className="text-white block">💊 Shoppers Drug Mart</b>
                    <span className="text-[10px] text-zinc-400">4 Items • $33.85 CAD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSample('costco_groceries')}
                    className="p-2.5 rounded-xl bg-[#080808] border border-zinc-800 hover:border-cyan-500/60 text-left text-xs cursor-pointer transition-all"
                  >
                    <b className="text-white block">🛒 Costco Wholesale</b>
                    <span className="text-[10px] text-zinc-400">6 Items • $78.10 CAD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSample('roommate_dinner')}
                    className="p-2.5 rounded-xl bg-[#080808] border border-zinc-800 hover:border-rose-500/60 text-left text-xs cursor-pointer transition-all"
                  >
                    <b className="text-white block">🥩 The Keg Dinner</b>
                    <span className="text-[10px] text-zinc-400">5 Items • $176.85</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: REVIEW ITEMS & BILL SPLIT */
            scannedReceipt && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Image Thumbnail & Merchant Bar */}
                <div className="p-3.5 rounded-2xl bg-[#000000] border border-zinc-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {receiptImage && (
                      <img 
                        src={receiptImage} 
                        alt="Receipt" 
                        className="w-12 h-12 rounded-xl object-cover border border-zinc-700 flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <input
                        type="text"
                        value={scannedReceipt.merchant}
                        onChange={(e) => setScannedReceipt({ ...scannedReceipt, merchant: e.target.value })}
                        className="bg-transparent text-sm font-black text-white focus:outline-none focus:border-b border-cyan-400 truncate w-full"
                      />
                      <span className="text-[10px] text-cyan-400 font-mono">Recognized Canadian Store</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="date"
                      value={scannedReceipt.date}
                      onChange={(e) => setScannedReceipt({ ...scannedReceipt, date: e.target.value })}
                      className="bg-[#080808] border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Raw OCR Text Drawer */}
                {rawOcrText && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowRawTextDrawer(!showRawTextDrawer)}
                      className="text-[10px] text-zinc-400 hover:text-cyan-300 flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <Eye size={12} />
                      <span>{showRawTextDrawer ? 'Hide Raw OCR Text' : 'Inspect Raw OCR Extracted Text'}</span>
                    </button>
                    {showRawTextDrawer && (
                      <pre className="mt-1.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {rawOcrText}
                      </pre>
                    )}
                  </div>
                )}

                {/* Items Table */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <FileText size={13} className="text-cyan-400" />
                      <span>Recognized Items ({scannedReceipt.items.length})</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-[#000000]">
                    <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-zinc-900/60 border-b border-zinc-800 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                      <span className="col-span-6">Item Description</span>
                      <span className="col-span-2 text-center">Qty</span>
                      <span className="col-span-3 text-right">Price</span>
                      <span className="col-span-1 text-center"></span>
                    </div>

                    <div className="divide-y divide-zinc-800/60 max-h-48 overflow-y-auto">
                      {scannedReceipt.items.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 px-3 py-1.5 items-center text-xs">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                            className="col-span-6 bg-transparent border-0 text-white font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1 text-xs"
                          />
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="col-span-2 bg-[#080808] border border-zinc-800 rounded text-center py-0.5 text-zinc-300 font-mono text-xs"
                          />
                          <div className="col-span-3 text-right font-mono flex items-center justify-end gap-1 text-xs">
                            <span className="text-zinc-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-16 bg-[#080808] border border-zinc-800 rounded text-right px-1 py-0.5 text-white font-bold"
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-zinc-600 hover:text-rose-400 p-1 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Financial Summary */}
                    <div className="p-3 bg-zinc-950 border-t border-zinc-800 space-y-1 text-xs">
                      <div className="flex justify-between text-zinc-400">
                        <span>Items Subtotal:</span>
                        <span className="font-mono text-white">${scannedReceipt.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-400">
                        <span>Tax (HST / GST):</span>
                        <div className="flex items-center gap-1 font-mono">
                          <span>$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={scannedReceipt.tax}
                            onChange={(e) => {
                              const taxVal = parseFloat(e.target.value) || 0;
                              setScannedReceipt({
                                ...scannedReceipt,
                                tax: taxVal,
                                total: Number((scannedReceipt.subtotal + taxVal + scannedReceipt.tip).toFixed(2)),
                              });
                            }}
                            className="w-14 bg-[#000000] border border-zinc-800 rounded text-right px-1 text-white text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-zinc-800">
                        <span className="text-cyan-400">Total Bill:</span>
                        <span className="font-mono text-base font-black text-cyan-400">
                          ${scannedReceipt.total.toFixed(2)} <span className="text-xs text-zinc-400">{scannedReceipt.currency}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3-Mode Roommate Split Module */}
                <div className="p-4 rounded-2xl bg-[#000000] border border-zinc-800 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-cyan-400" />
                      <h3 className="text-xs sm:text-sm font-bold text-white">Split This Bill With Roommates?</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={enableSplit} 
                        onChange={(e) => setEnableSplit(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  {enableSplit && (
                    <div className="space-y-3 pt-1 animate-in fade-in">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                          Select Friends:
                        </span>
                        {contacts.length === 0 ? (
                          <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
                            No friends added yet. Add friends on the Tabs page.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {contacts.map((c) => {
                              const isSelected = selectedFriendIds.includes(c.id);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => toggleFriend(c.id)}
                                  className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                                    isSelected
                                      ? 'bg-cyan-950 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400'
                                      : 'bg-[#080808] border-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  <img
                                    src={c.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.name)}`}
                                    alt={c.name}
                                    className="w-4 h-4 rounded-full"
                                  />
                                  <span>{c.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {selectedFriendIds.length > 0 && (
                        <div className="space-y-2.5 pt-1">
                          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-900 rounded-xl">
                            <button
                              type="button"
                              onClick={() => setSplitMode('equal')}
                              className={`py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                                splitMode === 'equal' ? 'bg-cyan-600 text-white' : 'text-zinc-400'
                              }`}
                            >
                              <Divide size={12} />
                              <span>Equal (1/N)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSplitMode('percentage')}
                              className={`py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                                splitMode === 'percentage' ? 'bg-cyan-600 text-white' : 'text-zinc-400'
                              }`}
                            >
                              <Percent size={12} />
                              <span>Percent (%)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSplitMode('custom')}
                              className={`py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                                splitMode === 'custom' ? 'bg-cyan-600 text-white' : 'text-zinc-400'
                              }`}
                            >
                              <DollarSign size={12} />
                              <span>Exact ($)</span>
                            </button>
                          </div>

                          {splitMode === 'equal' && (
                            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs flex justify-between items-center">
                              <span className="text-zinc-300">Divided by {totalParticipants} people</span>
                              <span className="text-sm font-black font-mono text-cyan-300">
                                ${equalSplitAmount.toFixed(2)} / person
                              </span>
                            </div>
                          )}

                          {splitMode === 'percentage' && (
                            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                              <div className="flex justify-between font-bold text-white pb-1.5 border-b border-zinc-800">
                                <span>Your Share:</span>
                                <span className="font-mono text-cyan-400">{myPercentage}% (${((totalAmount * myPercentage) / 100).toFixed(2)})</span>
                              </div>
                              {selectedFriendIds.map((cId) => {
                                const friend = contacts.find(c => c.id === cId);
                                const pct = customPercentages[cId] || Number((100 / totalParticipants).toFixed(0));
                                return (
                                  <div key={cId} className="flex justify-between items-center">
                                    <span className="text-zinc-300">{friend?.name}:</span>
                                    <div className="flex items-center gap-1 font-mono">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={customPercentages[cId] ?? pct}
                                        onChange={(e) => {
                                          const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                                          setCustomPercentages({ ...customPercentages, [cId]: val });
                                        }}
                                        className="w-12 bg-black border border-zinc-700 rounded p-0.5 text-center text-white"
                                      />
                                      <span className="text-zinc-500">%</span>
                                      <span className="text-zinc-400 text-[10px] w-14 text-right">${((totalAmount * pct) / 100).toFixed(2)}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {splitMode === 'custom' && (
                            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                              <div className="flex justify-between items-center pb-1.5 border-b border-zinc-800">
                                <span className="font-bold text-white">Status:</span>
                                <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                                  remainingUnallocated === 0 ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                                }`}>
                                  {remainingUnallocated === 0 ? 'Fully Allocated ✅' : `Remaining: $${remainingUnallocated.toFixed(2)}`}
                                </span>
                              </div>
                              {selectedFriendIds.map((cId) => {
                                const friend = contacts.find(c => c.id === cId);
                                return (
                                  <div key={cId} className="flex justify-between items-center">
                                    <span className="text-zinc-300">{friend?.name} owes:</span>
                                    <div className="flex items-center gap-1 font-mono">
                                      <span className="text-zinc-500">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={customAmounts[cId] ?? ''}
                                        onChange={(e) => {
                                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                                          setCustomAmounts({ ...customAmounts, [cId]: val });
                                        }}
                                        className="w-20 bg-black border border-zinc-700 rounded p-0.5 text-right text-white"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
                  >
                    ← Rescan
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndSplit}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xl cursor-pointer transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1.5"
                    style={{ background: `linear-gradient(135deg, ${auraColor}, #00b4d8)` }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Logging...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} />
                        <span>{enableSplit && selectedFriendIds.length > 0 ? 'Log to Ledger & Post Tabs IOUs' : 'Save Scanned Bill to Ledger'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
