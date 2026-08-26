import React, { useState } from 'react';
import { Send, CheckCircle2, X, HelpCircle } from 'lucide-react';
import { vaultApi } from '../../lib/vaultApi';

interface TelegramConnectModalProps {
  currentChatId?: string | null;
  onClose: () => void;
  onSaved: (chatId: string) => void;
}

export function TelegramConnectModal({ currentChatId, onClose, onSaved }: TelegramConnectModalProps) {
  const [chatId, setChatId] = useState(currentChatId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      await vaultApi.updateProfile({ telegramChatId: chatId.trim() });
      setStatusMessage('✅ Telegram Chat ID saved successfully!');
      onSaved(chatId.trim());
    } catch (err: any) {
      setIsError(true);
      setStatusMessage('⚠️ Failed to save Telegram Chat ID.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!chatId.trim()) {
      setIsError(true);
      setStatusMessage('Please enter a Chat ID first.');
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      await vaultApi.testTelegramConnection(chatId.trim());
      setStatusMessage('🎉 Test message sent! Check your Telegram app.');
    } catch (err: any) {
      setIsError(true);
      setStatusMessage(
        err.response?.data?.error ||
          '⚠️ Could not deliver message. Make sure you messaged the bot or started it first!'
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#0088cc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Send size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>Connect Telegram Alerts</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                100% Free & Instant reminders on your phone
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-outline btn-sm" style={{ padding: '0.375rem' }}>
            <X size={16} />
          </button>
        </div>

        {/* How-to guide */}
        <div
          style={{
            background: 'rgba(0, 136, 204, 0.08)',
            border: '1px solid rgba(0, 136, 204, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.25rem',
            fontSize: '0.8125rem',
            color: 'var(--text-main)',
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <HelpCircle size={15} style={{ color: '#38bdf8' }} /> How to get your Chat ID (20 seconds):
          </p>
          <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <li>
              Open Telegram and search for <b>@userinfobot</b> (or <b>@chatid_echo_bot</b>).
            </li>
            <li>
              Click <b>Start</b>. It will immediately reply with your numeric <b>Id</b> (e.g. <code>123456789</code>).
            </li>
            <li>
              Paste that number below and click <b>Save Connection</b>!
            </li>
          </ol>
        </div>

        {statusMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
              background: isError ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: isError ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
              color: isError ? '#fda4af' : '#6ee7b7',
            }}
          >
            {statusMessage}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="chatId">
              Your Telegram Chat ID:
            </label>
            <input
              type="text"
              id="chatId"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="form-control"
              placeholder="e.g. 987654321"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !chatId.trim()}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              <Send size={14} />
              {isTesting ? 'Sending test...' : 'Send Test Alert'}
            </button>

            <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ flex: 1 }}>
              <CheckCircle2 size={16} />
              {isSaving ? 'Saving...' : 'Save Connection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
