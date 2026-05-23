'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

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
    setTimeout(() => router.push('/shop'), 2000);
  };

  if (success) {
    return (
      <div style={{ fontFamily: 'Georgia, serif', maxWidth: 480, margin: '120px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: '#0D9488', fontSize: 13, letterSpacing: '0.15em' }}>INTERTEXE</p>
        <h1 style={{ fontSize: 24, color: '#1C2B2A', fontWeight: 'normal', margin: '16px 0' }}>Password updated.</h1>
        <p style={{ color: '#64748B' }}>Redirecting you to the shop...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Georgia, serif', maxWidth: 480, margin: '120px auto', padding: '0 24px' }}>
      <p style={{ color: '#0D9488', fontSize: 13, letterSpacing: '0.15em', marginBottom: 32 }}>INTERTEXE · THE MATERIAL STANDARD</p>
      <h1 style={{ fontSize: 28, color: '#1C2B2A', fontWeight: 'normal', margin: '0 0 8px' }}>Reset your password</h1>
      <p style={{ color: '#64748B', fontSize: 14, marginBottom: 32 }}>Enter a new password for your account.</p>

      {!sessionReady && (
        <p style={{ color: '#94A3B8', fontSize: 13 }}>Verifying reset link...</p>
      )}

      {sessionReady && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', color: '#64748B', marginBottom: 8 }}>
              NEW PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'Georgia, serif', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.15em', color: '#64748B', marginBottom: 8 }}>
              CONFIRM PASSWORD
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'Georgia, serif', boxSizing: 'border-box' }}
            />
          </div>
          {error && (
            <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#1C2B2A', color: 'white', padding: '14px', border: 'none', fontSize: 13, letterSpacing: '0.1em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </button>
        </form>
      )}
    </div>
  );
}
