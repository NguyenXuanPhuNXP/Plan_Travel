import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
let sdkPromise;

function loadGoogleSDK() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        document.head.appendChild(script);
      }
      // Also supports an SDK already loading through GoogleOAuthProvider.
      const started = Date.now();
      const timer = window.setInterval(() => {
        if (window.google?.accounts?.id) {
          window.clearInterval(timer);
          resolve(window.google.accounts.id);
        } else if (Date.now() - started > 15000) {
          window.clearInterval(timer);
          reject(new Error('Không tải được dịch vụ Google. Bạn vẫn có thể đăng nhập bằng email.'));
        }
      }, 100);
    }).catch((error) => { sdkPromise = undefined; throw error; });
  }
  return sdkPromise;
}

export default function GoogleOneTap({ onCredential, onError, disabled = false }) {
  const container = useRef(null);
  const callbacks = useRef({ onCredential, onError, disabled });
  const [message, setMessage] = useState('');
  useEffect(() => { callbacks.current = { onCredential, onError, disabled }; });

  useEffect(() => {
    if (!CLIENT_ID || CLIENT_ID === 'dummy-google-client-id') return;
    let cancelled = false;
    let google;
    let processing = false;
    const abort = new AbortController();
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/google/challenge`, { signal: abort.signal });
        const challenge = await response.json();
        if (!response.ok) throw new Error(challenge.message || 'Không khởi tạo được đăng nhập Google.');
        google = await loadGoogleSDK();
        if (cancelled) return;
        google.initialize({
          client_id: CLIENT_ID,
          nonce: challenge.nonce,
          auto_select: false,
          callback: async ({ credential }) => {
            if (cancelled || processing || callbacks.current.disabled || !credential) return;
            processing = true;
            try {
              await callbacks.current.onCredential({ credential, nonceToken: challenge.nonceToken });
            } catch (error) {
              callbacks.current.onError?.(error.message || 'Đăng nhập Google thất bại.');
            } finally { processing = false; }
          }
        });
        google.renderButton(container.current, { theme: 'outline', size: 'large', text: 'continue_with', width: 300 });
        google.prompt();
      } catch (error) {
        if (!cancelled && error.name !== 'AbortError') setMessage(error.message);
      }
    })();
    return () => {
      cancelled = true;
      abort.abort();
      google?.cancel();
    };
  }, []);

  if (!CLIENT_ID || CLIENT_ID === 'dummy-google-client-id') {
    return <p role="status" style={{ fontSize: 13 }}>Đăng nhập Google chưa được cấu hình.</p>;
  }
  return <div aria-busy={disabled} style={{ marginBottom: 16 }}>
    <div ref={container} style={{ pointerEvents: disabled ? 'none' : 'auto', opacity: disabled ? 0.6 : 1 }} />
    {message && <p role="status" style={{ fontSize: 13 }}>{message}</p>}
  </div>;
}
