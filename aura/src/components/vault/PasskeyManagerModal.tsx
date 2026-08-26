import { useState, useEffect } from 'react';
import { vaultApi, type PasskeyInfo } from '../../lib/vaultApi';
import { startRegistration } from '@simplewebauthn/browser';
import { 
  KeyRound, 
  Trash2, 
  Fingerprint, 
  Smartphone, 
  Laptop, 
  Clock,
  Sparkles,
  Info
} from 'lucide-react';

interface PasskeyManagerModalProps {
  onClose: () => void;
  onPasskeyAdded?: () => void;
}

export function PasskeyManagerModal({ onClose, onPasskeyAdded }: PasskeyManagerModalProps) {
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPasskeys();
  }, []);

  const loadPasskeys = async () => {
    try {
      setLoading(true);
      const list = await vaultApi.getPasskeys();
      setPasskeys(list);
    } catch (err) {
      console.error('Failed to load passkeys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setIsRegistering(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Get options from server
      const options = await vaultApi.getPasskeyRegistrationOptions();

      // 2. Trigger browser/device WebAuthn modal (Face ID / Fingerprint / Windows Hello)
      const regResponse = await startRegistration({ optionsJSON: options });

      // 3. Send response back to server to verify and store public key
      const name = customName.trim() || getDefaultDeviceName();
      await vaultApi.verifyPasskeyRegistration(regResponse, name);

      setSuccessMsg(`✅ Passkey "${name}" registered successfully! You can now log in with 1 click.`);
      setCustomName('');
      await loadPasskeys();
      if (onPasskeyAdded) onPasskeyAdded();
    } catch (err: any) {
      console.error('Passkey registration failed:', err);
      if (err.name === 'NotAllowedError') {
        setError('Passkey prompt cancelled or timed out.');
      } else {
        setError(err.message || 'Could not register passkey on this device.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeletePasskey = async (id: string, name?: string) => {
    if (!confirm(`Are you sure you want to remove the passkey "${name || 'this device'}"?`)) return;

    try {
      await vaultApi.deletePasskey(id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      setSuccessMsg('Passkey removed.');
    } catch (err) {
      console.error('Failed to delete passkey:', err);
      setError('Could not delete passkey.');
    }
  };

  const getDefaultDeviceName = () => {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return 'Windows Hello';
    if (/iPhone|iPad/i.test(ua)) return 'Apple Face ID / Touch ID';
    if (/Macintosh/i.test(ua)) return 'Mac Touch ID';
    if (/Android/i.test(ua)) return 'Android Biometric';
    return 'Security Key / Device Passkey';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 30, 75, 0.15)',
                color: 'var(--crimson-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Passkey & Biometric Security</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Passwordless, unphishable login with Face ID, Touch ID & Windows Hello
              </p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="btn btn-outline btn-sm">
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255, 30, 75, 0.15)',
              border: '1px solid rgba(255, 30, 75, 0.35)',
              color: '#fda4af',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#6ee7b7',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Register New Passkey Section */}
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Sparkles size={16} color="#ff1e4b" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Add Passkey on this Device</h3>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
            Register your device's secure enclave (Touch ID, Face ID, Windows Hello, or hardware key) so you can log in instantly without typing your password.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder={`Device Name (e.g. ${getDefaultDeviceName()})`}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="form-control"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleRegisterPasskey}
              disabled={isRegistering}
              className="btn btn-primary"
            >
              <Fingerprint size={16} />
              {isRegistering ? 'Registering...' : 'Register Passkey'}
            </button>
          </div>
        </div>

        {/* Registered Passkeys List */}
        <div>
          <h4 style={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Registered Passkeys ({passkeys.length})
          </h4>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              Loading passkeys...
            </div>
          ) : passkeys.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                background: 'var(--bg-black)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem',
              }}
            >
              No passkeys registered yet. Click "Register Passkey" above to enable 1-click biometric login!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {passkeys.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-black)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 242, 254, 0.1)',
                        color: 'var(--accent-cyan)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {p.deviceType === 'singleDevice' ? <Laptop size={16} /> : <Smartphone size={16} />}
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#ffffff' }}>
                        {p.name || 'Biometric Passkey'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={11} />
                        Added {new Date(p.createdAt).toLocaleDateString()}
                        {p.lastUsedAt && ` • Last used ${new Date(p.lastUsedAt).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePasskey(p.id, p.name)}
                    className="btn btn-danger btn-sm"
                    title="Revoke passkey"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Info Footnote */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-subtle)',
            lineHeight: '1.4',
          }}
        >
          <Info size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--crimson-primary)' }} />
          <span>
            Passkeys use FIDO2/WebAuthn public-key cryptography. Your biometric data never leaves your device and private keys cannot be intercepted or phished.
          </span>
        </div>
      </div>
    </div>
  );
}
