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
  FileText, 
  Sparkles, 
  Receipt, 
  Divide,
  Eye,
  FileCode,
  RefreshCw,
  Zap,
  Layers,
  Check,
  Split
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
  
  // Split Type: 'basic' (Equal or Custom) vs 'advanced' (Item-by-Item Who Bought What)
  const [splitEngine, setSplitEngine] = useState<'basic' | 'advanced'>('basic');
  const [basicSplitMode, setBasicSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});

  // Advanced Item-by-Item Assignees Map: { [itemId]: string[] (array of friend IDs or 'me') }
  const [itemAssignees, setItemAssignees] = useState<Record<string, string[]>>({});

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

  // Initialize Item Assignees to 'me' when receipt loads
  useEffect(() => {
    if (scannedReceipt?.items) {
      const initialMap: Record<string, string[]> = {};
      scannedReceipt.items.forEach((item) => {
        initialMap[item.id] = ['me'];
      });
      setItemAssignees(initialMap);
    }
  }, [scannedReceipt]);

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

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
      console.warn('Direct back-camera stream failed, falling back to file input:', err);
      setIsCameraActive(false);
      fileInputRef.current?.click();
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startLiveCamera(nextFacing);
  };

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

  const processImageWithOcr = async (rawImageUrl: string) => {
    setIsScanning(true);
    setScanProgress(10);
    setScanStatusMessage('Enhancing image contrast & text clarity...');
    setReceiptImage(rawImageUrl);

    try {
      const preprocessed = await preprocessImageForOcr(rawImageUrl);

      setScanProgress(25);
      setScanStatusMessage('Reading store name, line items & prices...');

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
          }
        }
      );

      setRawOcrText(text);

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
    const newItemId = `item-new-${Date.now()}`;
    const newItem: ReceiptItem = {
      id: newItemId,
      name: 'New Item',
      price: 0,
      quantity: 1,
    };
    setScannedReceipt({
      ...scannedReceipt,
      items: [...scannedReceipt.items, newItem],
    });
    setItemAssignees({
      ...itemAssignees,
      [newItemId]: ['me'],
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

  // Toggle Friend in Selection Pool
  const toggleFriend = (id: string) => {
    if (selectedFriendIds.includes(id)) {
      setSelectedFriendIds(selectedFriendIds.filter(fId => fId !== id));
      // Remove from item assignees
      const updatedAssignees = { ...itemAssignees };
      Object.keys(updatedAssignees).forEach((itemId) => {
        updatedAssignees[itemId] = updatedAssignees[itemId].filter(aId => aId !== id);
        if (updatedAssignees[itemId].length === 0) updatedAssignees[itemId] = ['me'];
      });
      setItemAssignees(updatedAssignees);
    } else {
      setSelectedFriendIds([...selectedFriendIds, id]);
    }
  };

  // Toggle Assignee on Specific Item (Me or Friend)
  const toggleItemAssignee = (itemId: string, assigneeId: string) => {
    const currentList = itemAssignees[itemId] || ['me'];
    let nextList: string[];

    if (currentList.includes(assigneeId)) {
      nextList = currentList.filter(id => id !== assigneeId);
      // If list becomes empty, default to 'me'
      if (nextList.length === 0) nextList = ['me'];
    } else {
      nextList = [...currentList, assigneeId];
    }

    setItemAssignees({
      ...itemAssignees,
      [itemId]: nextList,
    });
  };

  // Set Item Assignee to "All" (Everyone Selected + Me)
  const setItemToAll = (itemId: string) => {
    setItemAssignees({
      ...itemAssignees,
      [itemId]: ['me', ...selectedFriendIds],
    });
  };

  // Financial Calculations
  const totalAmount = scannedReceipt?.total || 0;
  const taxAmount = scannedReceipt?.tax || 0;
  const tipAmount = scannedReceipt?.tip || 0;
  const totalParticipants = selectedFriendIds.length + 1;

  // Basic Equal Split
  const equalSplitAmount = totalParticipants > 0 ? Number((totalAmount / totalParticipants).toFixed(2)) : 0;
  const sumOfCustomAmounts = Object.values(customAmounts).reduce((s, a) => s + (Number(a) || 0), 0);
  const remainingUnallocated = Number((totalAmount - sumOfCustomAmounts).toFixed(2));

  // Advanced Item-by-Item Shares Calculation
  const calculateItemizedShares = () => {
    const shares: Record<string, { subtotal: number; taxTip: number; total: number; itemsCount: number }> = {
      me: { subtotal: 0, taxTip: 0, total: 0, itemsCount: 0 },
    };

    selectedFriendIds.forEach((fId) => {
      shares[fId] = { subtotal: 0, taxTip: 0, total: 0, itemsCount: 0 };
    });

    if (!scannedReceipt) return shares;

    // Distribute Item Prices
    scannedReceipt.items.forEach((item) => {
      const assignees = itemAssignees[item.id] || ['me'];
      const validAssignees = assignees.filter(id => id === 'me' || selectedFriendIds.includes(id));
      const activeAssignees = validAssignees.length > 0 ? validAssignees : ['me'];
      
      const itemCost = Number(item.price) * Number(item.quantity || 1);
      const perAssigneeCost = itemCost / activeAssignees.length;

      activeAssignees.forEach((aId) => {
        if (shares[aId]) {
          shares[aId].subtotal += perAssigneeCost;
          shares[aId].itemsCount += 1;
        }
      });
    });

    // Distribute Tax & Tip proportionally
    const totalExtra = taxAmount + tipAmount;
    const combinedSubtotal = Object.values(shares).reduce((s, v) => s + v.subtotal, 0) || 1;

    Object.keys(shares).forEach((aId) => {
      const proportion = shares[aId].subtotal / combinedSubtotal;
      const taxTipShare = totalExtra * proportion;
      shares[aId].taxTip = Number(taxTipShare.toFixed(2));
      shares[aId].total = Number((shares[aId].subtotal + taxTipShare).toFixed(2));
      shares[aId].subtotal = Number(shares[aId].subtotal.toFixed(2));
    });

    return shares;
  };

  const itemizedShares = calculateItemizedShares();

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

          if (splitEngine === 'basic') {
            if (basicSplitMode === 'equal') {
              share = equalSplitAmount;
            } else if (basicSplitMode === 'custom') {
              share = customAmounts[contactId] || 0;
            }
          } else if (splitEngine === 'advanced') {
            share = itemizedShares[contactId]?.total || 0;
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
                  Itemized Split Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                Scan receipts & split equally or item-by-item according to who bought what
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

                  <div className="absolute inset-4 border-2 border-dashed border-cyan-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                    <span className="text-[10px] uppercase font-bold text-cyan-300 bg-black/60 px-2 py-0.5 rounded self-start">
                      Align Receipt Within Box
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 bg-black/60 px-2 py-0.5 rounded self-end">
                      Rear Camera Active (HD)
                    </span>
                  </div>

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

              <div className="p-3.5 rounded-2xl bg-[#000000] border border-zinc-800 space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode size={13} className="text-cyan-400" />
                  <span>Or Paste E-Bill / Receipt Text Directly</span>
                </span>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    placeholder="Dollarama\nFOLDING UMBRELLA $3.75\nBENTO BOX $4.00\nHST $1.00\nTotal $8.75"
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
                    onClick={() => handleSelectSample('dollarama_haul')}
                    className="p-2.5 rounded-xl bg-[#080808] border border-zinc-800 hover:border-amber-500/60 text-left text-xs cursor-pointer transition-all"
                  >
                    <b className="text-white block">🛒 Dollarama Haul</b>
                    <span className="text-[10px] text-zinc-400">11 Items • $29.95 CAD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSample('shoppers_drug_mart')}
                    className="p-2.5 rounded-xl bg-[#080808] border border-zinc-800 hover:border-emerald-500/60 text-left text-xs cursor-pointer transition-all"
                  >
                    <b className="text-white block">💊 Shoppers Drug Mart</b>
                    <span className="text-[10px] text-zinc-400">1 Item • $1.98 CAD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSample('costco_groceries')}
                    className="p-2.5 rounded-xl bg-[#080808] border border-zinc-800 hover:border-cyan-500/60 text-left text-xs cursor-pointer transition-all"
                  >
                    <b className="text-white block">📦 Costco Wholesale</b>
                    <span className="text-[10px] text-zinc-400">6 Items • $78.10 CAD</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: REVIEW ITEMS & COMPREHENSIVE BILL SPLIT */
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

                {/* ADVANCED / BASIC BILL SPLIT MODULE */}
                <div className="p-4 rounded-2xl bg-[#000000] border border-zinc-800 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-cyan-400" />
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
                    <div className="space-y-4 pt-1 animate-in fade-in">
                      {/* Step 1: Pick Roommates */}
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                          1. Select Participants:
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
                                  className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-cyan-950 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400'
                                      : 'bg-[#080808] border-zinc-800 text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  <img
                                    src={c.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.name)}`}
                                    alt={c.name}
                                    className="w-4 h-4 rounded-full"
                                  />
                                  <span>{c.name}</span>
                                  {isSelected && <Check size={12} className="text-cyan-400 ml-0.5" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {selectedFriendIds.length > 0 && (
                        <div className="space-y-3">
                          {/* Split Engine Selector: Basic vs Advanced Itemized */}
                          <div className="flex items-center justify-between p-1 bg-zinc-900 rounded-xl">
                            <button
                              type="button"
                              onClick={() => setSplitEngine('basic')}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                splitEngine === 'basic' ? 'bg-cyan-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              <Divide size={13} />
                              <span>Basic Splitting</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSplitEngine('advanced')}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                splitEngine === 'advanced' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              <Layers size={13} />
                              <span>⚡ Advanced Item-by-Item Split</span>
                            </button>
                          </div>

                          {/* OPTION A: BASIC SPLITTING */}
                          {splitEngine === 'basic' && (
                            <div className="space-y-3 p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                              <div className="grid grid-cols-2 gap-2 p-1 bg-[#000000] rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => setBasicSplitMode('equal')}
                                  className={`py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                                    basicSplitMode === 'equal' ? 'bg-cyan-700 text-white' : 'text-zinc-400'
                                  }`}
                                >
                                  <Divide size={12} />
                                  <span>Split as {totalParticipants} People (1 / N)</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setBasicSplitMode('custom')}
                                  className={`py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                                    basicSplitMode === 'custom' ? 'bg-cyan-700 text-white' : 'text-zinc-400'
                                  }`}
                                >
                                  <DollarSign size={12} />
                                  <span>Exact Custom Amounts ($)</span>
                                </button>
                              </div>

                              {basicSplitMode === 'equal' && (
                                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs flex justify-between items-center">
                                  <span className="text-zinc-300">Total bill divided by {totalParticipants} people:</span>
                                  <span className="text-sm font-black font-mono text-cyan-300">
                                    ${equalSplitAmount.toFixed(2)} / person
                                  </span>
                                </div>
                              )}

                              {basicSplitMode === 'custom' && (
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between items-center pb-1.5 border-b border-zinc-800">
                                    <span className="font-bold text-white">Allocation Status:</span>
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

                          {/* OPTION B: ADVANCED ITEM-BY-ITEM SPLIT (WHO BOUGHT WHAT) */}
                          {splitEngine === 'advanced' && (
                            <div className="space-y-3 p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/40">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <Split size={13} className="text-purple-400" />
                                    <span>Who Bought What? (Tap names per item)</span>
                                  </h4>
                                  <p className="text-[10px] text-zinc-400 mt-0.5">
                                    Select who shared each item. Multiple people share 50/50. Taxes & tips are split proportionally.
                                  </p>
                                </div>
                              </div>

                              {/* Item Assignees List */}
                              <div className="divide-y divide-zinc-800/80 max-h-56 overflow-y-auto pr-1 space-y-2">
                                {scannedReceipt.items.map((item) => {
                                  const assignees = itemAssignees[item.id] || ['me'];
                                  const isAllSelected = assignees.includes('me') && selectedFriendIds.every(id => assignees.includes(id));

                                  return (
                                    <div key={item.id} className="pt-2 first:pt-0 space-y-1.5">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-zinc-200 truncate max-w-[200px]">{item.name}</span>
                                        <span className="font-mono font-bold text-white">${(Number(item.price) * Number(item.quantity || 1)).toFixed(2)}</span>
                                      </div>

                                      {/* Assignee Chips */}
                                      <div className="flex flex-wrap items-center gap-1">
                                        {/* You */}
                                        <button
                                          type="button"
                                          onClick={() => toggleItemAssignee(item.id, 'me')}
                                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                            assignees.includes('me')
                                              ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                                          }`}
                                        >
                                          You
                                        </button>

                                        {/* Selected Friends */}
                                        {selectedFriendIds.map((fId) => {
                                          const friend = contacts.find(c => c.id === fId);
                                          const isAssigned = assignees.includes(fId);
                                          return (
                                            <button
                                              key={fId}
                                              type="button"
                                              onClick={() => toggleItemAssignee(item.id, fId)}
                                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                                isAssigned
                                                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                                              }`}
                                            >
                                              {friend?.name || 'Friend'}
                                            </button>
                                          );
                                        })}

                                        {/* Everyone button */}
                                        <button
                                          type="button"
                                          onClick={() => setItemToAll(item.id)}
                                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                            isAllSelected
                                              ? 'bg-emerald-600 text-white border-emerald-400'
                                              : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                                          }`}
                                        >
                                          Shared All
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Calculated Summary Breakdown per Person */}
                              <div className="pt-3 border-t border-purple-500/30 space-y-2">
                                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                                  Live Itemized Breakdown (Items + HST):
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {/* Your Share */}
                                  <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex justify-between items-center">
                                    <div>
                                      <b className="text-white block">Your Share</b>
                                      <span className="text-[10px] text-zinc-400">
                                        {itemizedShares.me.itemsCount} items + ${itemizedShares.me.taxTip.toFixed(2)} tax
                                      </span>
                                    </div>
                                    <span className="font-mono font-black text-sm text-purple-300">
                                      ${itemizedShares.me.total.toFixed(2)}
                                    </span>
                                  </div>

                                  {/* Friends Shares */}
                                  {selectedFriendIds.map((fId) => {
                                    const friend = contacts.find(c => c.id === fId);
                                    const share = itemizedShares[fId] || { total: 0, itemsCount: 0, taxTip: 0 };
                                    return (
                                      <div key={fId} className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex justify-between items-center">
                                        <div>
                                          <b className="text-white block">{friend?.name}</b>
                                          <span className="text-[10px] text-zinc-400">
                                            {share.itemsCount} items + ${share.taxTip.toFixed(2)} tax
                                          </span>
                                        </div>
                                        <span className="font-mono font-black text-sm text-cyan-300">
                                          ${share.total.toFixed(2)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
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
                        <span>
                          {enableSplit && selectedFriendIds.length > 0
                            ? splitEngine === 'advanced'
                              ? 'Log Ledger & Post Itemized IOUs'
                              : 'Log Ledger & Post Split IOUs'
                            : 'Save Scanned Bill to Ledger'}
                        </span>
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
