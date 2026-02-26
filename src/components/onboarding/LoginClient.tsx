'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
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
      registrationOpen: true;
      warnings?: string[];
    }
  | {
      mode: 'setup';
      hasUsers: false;
      registrationOpen: true;
      setup: SetupInfo;
    };

const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N}._-]{3,24}$/u;

export function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<'loading' | 'setup' | 'ready'>('loading');
  const [formMode, setFormMode] = useState<'login' | 'register'>('login');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [setupInfo, setSetupInfo] = useState<SetupInfo | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(true);
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
      setRegistrationOpen(data.registrationOpen);
      setSetupInfo(data.setup);
      return;
    }

    setMode('ready');
    setFormMode(data.mode);
    setRegistrationOpen(data.registrationOpen);
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
    if (mode !== 'ready') {
      return;
    }

    setIsLoading(true);
    setError(null);

    const endpoint = formMode === 'login' ? '/api/session/start' : '/api/auth/register';
    const payload =
      formMode === 'login'
        ? { email, password }
        : {
            email,
            displayName,
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

    router.replace('/today');
    router.refresh();
  };

  const canSubmit =
    mode === 'ready' &&
    !isLoading &&
    email.trim().length > 0 &&
    password.trim().length >= 8 &&
    (formMode === 'login' ||
      (confirmPassword.trim().length >= 8 && DISPLAY_NAME_PATTERN.test(displayName.trim())));

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
          {mode === 'ready' && registrationOpen && (
            <div className="login-mode-switch">
              <Button
                onClick={() => setFormMode('login')}
                size="sm"
                type="button"
                variant={formMode === 'login' ? 'primary' : 'ghost'}
              >
                {uiCopy.login.switchToLogin}
              </Button>
              <Button
                onClick={() => setFormMode('register')}
                size="sm"
                type="button"
                variant={formMode === 'register' ? 'primary' : 'ghost'}
              >
                {uiCopy.login.switchToRegister}
              </Button>
            </div>
          )}

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

          {formMode === 'register' && (
            <label className="stack-sm" htmlFor="displayName">
              {uiCopy.login.displayNameLabel}
              <input
                autoComplete="nickname"
                id="displayName"
                maxLength={24}
                minLength={3}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={uiCopy.login.displayNamePlaceholder}
                type="text"
                value={displayName}
              />
              <small>{uiCopy.login.displayNameHint}</small>
            </label>
          )}

          <label className="stack-sm" htmlFor="password">
            {uiCopy.login.passwordLabel}
            <input
              autoComplete={formMode === 'login' ? 'current-password' : 'new-password'}
              id="password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={uiCopy.login.passwordPlaceholder}
              type="password"
              value={password}
            />
          </label>

          {formMode === 'register' && (
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

          <Button onClick={handleStart} size="lg" variant="primary" disabled={!canSubmit}>
            {isLoading
              ? formMode === 'register'
                ? uiCopy.login.loadingRegister
                : uiCopy.login.loadingLogin
              : formMode === 'login'
                ? uiCopy.login.ctaLogin
                : uiCopy.login.ctaRegister}
          </Button>
          <Button onClick={() => void loadStatus()} size="sm" variant="ghost">
            {uiCopy.login.refreshStatus}
          </Button>
          <small>
            {mode === 'loading'
              ? uiCopy.login.checkingStatus
              : mode === 'setup'
                ? uiCopy.login.setupHelp
                : formMode === 'login'
                  ? uiCopy.login.loginHelp
                  : uiCopy.login.registerHelp}
          </small>
        </div>
      </section>
    </>
  );
}
