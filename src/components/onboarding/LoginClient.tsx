'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { uiCopy } from '@/lib/copy';

type SetupInfo = {
  code: string;
  title: string;
  message: string;
  steps: string[];
};

type AuthStatusPayload =
  | {
      mode: 'login' | 'register';
      hasUsers: boolean;
      warnings?: string[];
    }
  | {
      mode: 'setup';
      hasUsers: false;
      setup: SetupInfo;
    };

export function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<'loading' | 'login' | 'register' | 'setup'>('loading');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [setupInfo, setSetupInfo] = useState<SetupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromLandingTransition, setFromLandingTransition] = useState(false);

  const loadStatus = async () => {
    setMode('loading');
    setWarnings([]);
    setSetupInfo(null);

    const response = await fetch('/api/auth/status', { cache: 'no-store' });
    const data = (await response.json().catch(() => null)) as AuthStatusPayload | null;

    if (!data) {
      setMode('setup');
      setSetupInfo({
        code: 'RUNTIME_ERROR',
        title: uiCopy.login.fallbackSetupTitle,
        message: uiCopy.login.fallbackSetupMessage,
        steps: [...uiCopy.login.fallbackSetupSteps]
      });
      return;
    }

    if (data.mode === 'setup') {
      setMode('setup');
      setSetupInfo(data.setup);
      return;
    }

    setMode(data.mode);
    setWarnings(data.warnings ?? []);
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const transitionSource = window.sessionStorage.getItem('pf-login-transition');
    if (transitionSource === 'landing-dive') {
      setFromLandingTransition(true);
      window.sessionStorage.removeItem('pf-login-transition');
    }
  }, []);

  const handleStart = async () => {
    if (mode === 'loading' || mode === 'setup') {
      return;
    }

    setIsLoading(true);
    setError(null);

    const endpoint = mode === 'login' ? '/api/session/start' : '/api/auth/register';
    const payload =
      mode === 'login'
      ? { email, password }
      : {
          email,
          password,
          confirmPassword
        };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (!response) {
      setError(uiCopy.login.noBackendResponseError);
      setIsLoading(false);
      return;
    }

    if (!response.ok) {
      const responsePayload = (await response.json().catch(() => ({ error: uiCopy.login.sessionStartFallbackError }))) as {
        error?: string;
        setup?: SetupInfo;
      };
      setError(responsePayload.error ?? uiCopy.login.sessionStartRetryError);
      if (response.status === 503 && responsePayload.setup) {
        setMode('setup');
        setSetupInfo(responsePayload.setup);
      }
      setIsLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <>
      {fromLandingTransition && <div aria-hidden className="login-transition-backdrop" />}
      <section className={['panel auth-panel', fromLandingTransition ? 'auth-panel--from-landing' : ''].join(' ')}>
      <header className="hero-header">
        <span className="eyebrow">{uiCopy.login.heroEyebrow}</span>
        <h1>{uiCopy.login.heroTitle}</h1>
        <p className="hero-support">{uiCopy.login.heroSupport}</p>
      </header>

      {setupInfo && (
        <Banner tone="warning" title={setupInfo.title}>
          {setupInfo.message}
          <ul className="setup-help-list">
            {setupInfo.steps.map((step, index) => (
              <li key={`${setupInfo.code}-${index}`}>{step}</li>
            ))}
          </ul>
        </Banner>
      )}

      {warnings.map((warning, index) => (
        <Banner key={`warn-${index}`} tone="info" title={uiCopy.login.warningTitle}>
          {warning}
        </Banner>
      ))}

      {error && (
        <Banner tone="danger" title={uiCopy.login.launchErrorTitle}>
          {error}
        </Banner>
      )}

      <div className="stack">
        <label className="stack-sm" htmlFor="email">
          {uiCopy.login.emailLabel}
          <input
            autoComplete="email"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={uiCopy.login.emailPlaceholder}
            type="email"
            value={email}
          />
        </label>

        <label className="stack-sm" htmlFor="password">
          {uiCopy.login.passwordLabel}
          <input
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            id="password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={uiCopy.login.passwordPlaceholder}
            type="password"
            value={password}
          />
        </label>

        {mode === 'register' && (
          <label className="stack-sm" htmlFor="confirmPassword">
            {uiCopy.login.confirmPasswordLabel}
            <input
              autoComplete="new-password"
              id="confirmPassword"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={uiCopy.login.confirmPasswordPlaceholder}
              type="password"
              value={confirmPassword}
            />
          </label>
        )}

        <Button
          onClick={handleStart}
          size="lg"
          variant="primary"
          disabled={
            isLoading ||
            mode === 'loading' ||
            mode === 'setup' ||
            !email.trim() ||
            password.trim().length < 8 ||
            (mode === 'register' && confirmPassword.trim().length < 8)
          }
        >
          {isLoading
            ? mode === 'register'
              ? uiCopy.login.loadingRegister
              : uiCopy.login.loadingLogin
            : mode === 'login'
              ? uiCopy.login.ctaLogin
              : mode === 'register'
                ? uiCopy.login.ctaRegister
                : uiCopy.login.ctaUnavailable}
        </Button>
        <Button onClick={() => void loadStatus()} size="sm" variant="ghost">
          {uiCopy.login.refreshStatus}
        </Button>
        <small>
          {mode === 'loading'
            ? uiCopy.login.checkingStatus
            : mode === 'login'
              ? uiCopy.login.loginHelp
              : mode === 'register'
                ? uiCopy.login.registerHelp
                : uiCopy.login.setupHelp}
        </small>
      </div>
      </section>
    </>
  );
}
