'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const INK = '#1C2B2A';
const MUTED = '#64748B';
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #94A3B8',
  fontSize: 16,
  fontFamily: 'Georgia, serif',
  boxSizing: 'border-box',
  color: INK,
  background: '#F4F4F4',
  WebkitTextFillColor: INK,
};

function parseHashParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const raw = window.location.hash.replace(/^#/, '');
  const out: Record<string, string> = {};
  for (const part of raw.split('&')) {
    if (!part) continue;
    const [k, v] = part.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return out;
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [status, setStatus] = useState('Verifying reset link…');
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const markReady = () => {
      if (!cancelled) setSessionReady(true);
    };

    const run = async () => {
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        markReady();
        return;
      }

      const hash = parseHashParams();
      if (hash.access_token && hash.refresh_token) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: hash.access_token,
          refresh_token: hash.refresh_token,
        });
        if (!setErr) {
          markReady();
          return;
        }
      }

      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (!exErr) {
          markReady();
          return;
        }
        if (!cancelled) {
          setError(
            'This reset link was started in the INTERTEXE app. Open it from Mail in Safari, or tap Open INTERTEXE below.'
          );
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) markReady();
    });

    void run();

    const timeout = window.setTimeout(() => {
      if (cancelled || sessionReady) return;
      setStatus('Still verifying…');
      setError(
        (prev) =>
          prev ||
          'This reset link did not complete in the browser. Open INTERTEXE to finish, or request a new reset email from the app.'
      );
    }, 8000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [supabase, sessionReady]);

  const openAppHref = () => {
    if (typeof window === 'undefined') return 'https://www.intertexe.com/open?next=/reset-password&itx_cta=password_reset';
    const qs = window.location.search || '';
    return `https://www.intertexe.com/open?next=${encodeURIComponent(`/reset-password${qs}`)}&itx_cta=password_reset`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    const next =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('next') || '/open?next=/account&itx_cta=password_reset_done'
        : '/shop';
    setTimeout(() => router.push(next), 1500);
  };

  if (success) {
    return (
      <div style={{ fontFamily: 'Georgia, serif', maxWidth: 480, margin: '120px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: '#0D9488', fontSize: 13, letterSpacing: '0.15em' }}>INTERTEXE</p>
        <h1 style={{ fontSize: 24, color: INK, fontWeight: 'normal', margin: '16px 0' }}>Password updated.</h1>
        <p style={{ color: MUTED }}>Opening INTERTEXE…</p>
        <p style={{ marginTop: 24 }}>
          <a href="https://www.intertexe.com/open?next=/account&itx_cta=password_reset_done" style={{ color: INK }}>
            Open the app
          </a>
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Georgia, serif', maxWidth: 480, margin: '120px auto', padding: '0 24px', color: INK }}>
      <p style={{ color: MUTED, fontSize: 13, letterSpacing: '0.15em', marginBottom: 32 }}>INTERTEXE · THE MATERIAL STANDARD</p>
      <h1 style={{ fontSize: 28, color: INK, fontWeight: 'normal', margin: '0 0 8px' }}>Reset your password</h1>
      <p style={{ color: MUTED, fontSize: 14, marginBottom: 32 }}>Enter a new password for your account.</p>

      {!sessionReady && (
        <p style={{ color: MUTED, fontSize: 13 }}>{status}</p>
      )}

      {error ? (
        <p style={{ color: '#B91C1C', fontSize: 13, margin: '16px 0', lineHeight: 1.5 }}>{error}</p>
      ) : null}

      {!sessionReady ? (
        <p style={{ marginTop: 24 }}>
          <a href={openAppHref()} style={{ color: INK, textDecoration: 'underline' }}>
            Open INTERTEXE to finish
          </a>
        </p>
      ) : null}

      {sessionReady && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', color: MUTED, marginBottom: 8 }}>
              NEW PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', color: MUTED, marginBottom: 8 }}>
              CONFIRM PASSWORD
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: INK, color: 'white', padding: '14px', border: 'none', fontSize: 13, letterSpacing: '0.1em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </button>
        </form>
      )}
    </div>
  );
}
