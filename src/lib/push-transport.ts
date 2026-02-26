import webpush, { WebPushError, type PushSubscription, type SendResult } from 'web-push';

export type PushTransportMode = 'simulate' | 'disabled' | 'webpush';

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushDeliveryResult = {
  ok: boolean;
  hardFail: boolean;
  temporary: boolean;
  detail: string;
};

type VapidConfig = {
  subject: string;
  publicKey: string;
  privateKey: string;
};

let configuredVapidFingerprint: string | null = null;

export function resolvePushTransportMode(value = process.env.ENGAGEMENT_PUSH_TRANSPORT): PushTransportMode {
  if (value === 'disabled') {
    return 'disabled';
  }

  if (value === 'webpush') {
    return 'webpush';
  }

  return 'simulate';
}

export function normalizePushPayload(value: unknown): PushPayload {
  if (!value || typeof value !== 'object') {
    return {
      title: 'PatternFinder',
      body: 'Czas na check-in.',
      url: '/today'
    };
  }

  const raw = value as Partial<{ title: unknown; body: unknown; url: unknown }>;
  return {
    title: typeof raw.title === 'string' && raw.title.trim().length > 0 ? raw.title : 'PatternFinder',
    body: typeof raw.body === 'string' && raw.body.trim().length > 0 ? raw.body : 'Czas na check-in.',
    url: typeof raw.url === 'string' && raw.url.trim().length > 0 ? raw.url : '/today'
  };
}

export function classifyPushStatus(statusCode: number): { hardFail: boolean; temporary: boolean } {
  if (statusCode === 404 || statusCode === 410) {
    return {
      hardFail: true,
      temporary: false
    };
  }

  if (statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500) {
    return {
      hardFail: false,
      temporary: true
    };
  }

  return {
    hardFail: false,
    temporary: false
  };
}

function readVapidConfig(): VapidConfig | null {
  const subject = process.env.VAPID_SUBJECT?.trim();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();

  if (!subject || !publicKey || !privateKey) {
    return null;
  }

  return {
    subject,
    publicKey,
    privateKey
  };
}

function ensureWebPushConfigured() {
  const config = readVapidConfig();
  if (!config) {
    return {
      ok: false,
      detail:
        'Missing VAPID config. Set VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY for ENGAGEMENT_PUSH_TRANSPORT=webpush.'
    } as const;
  }

  const fingerprint = `${config.subject}:${config.publicKey}:${config.privateKey}`;
  if (configuredVapidFingerprint === fingerprint) {
    return {
      ok: true,
      config
    } as const;
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  configuredVapidFingerprint = fingerprint;

  return {
    ok: true,
    config
  } as const;
}

function toWebPushSubscription(input: PushSubscriptionInput): PushSubscription {
  return {
    endpoint: input.endpoint,
    keys: {
      p256dh: input.p256dh,
      auth: input.auth
    }
  };
}

function mapSendResult(result: SendResult): PushDeliveryResult {
  const classification = classifyPushStatus(result.statusCode);

  return {
    ok: result.statusCode >= 200 && result.statusCode < 300,
    hardFail: classification.hardFail,
    temporary: classification.temporary,
    detail: `webpush-${result.statusCode}`
  };
}

function mapSendError(error: WebPushError): PushDeliveryResult {
  const classification = classifyPushStatus(error.statusCode);
  const body = error.body ? ` body=${error.body}` : '';

  return {
    ok: false,
    hardFail: classification.hardFail,
    temporary: classification.temporary,
    detail: `webpush-${error.statusCode}${body}`
  };
}

export async function sendPushNotification(params: {
  endpoint: string;
  p256dh: string;
  auth: string;
  payload: PushPayload;
  ttlSeconds?: number;
}): Promise<PushDeliveryResult> {
  const mode = resolvePushTransportMode();

  if (mode === 'simulate') {
    return {
      ok: true,
      hardFail: false,
      temporary: false,
      detail: 'simulated'
    };
  }

  if (mode === 'disabled') {
    return {
      ok: false,
      hardFail: false,
      temporary: true,
      detail: 'transport disabled'
    };
  }

  const configured = ensureWebPushConfigured();
  if (!configured.ok) {
    return {
      ok: false,
      hardFail: false,
      temporary: false,
      detail: configured.detail
    };
  }

  try {
    const result = await webpush.sendNotification(
      toWebPushSubscription({
        endpoint: params.endpoint,
        p256dh: params.p256dh,
        auth: params.auth
      }),
      JSON.stringify(params.payload),
      {
        TTL: params.ttlSeconds ?? 120,
        urgency: 'high'
      }
    );

    return mapSendResult(result);
  } catch (error) {
    if (error instanceof WebPushError) {
      return mapSendError(error);
    }

    const message = error instanceof Error ? error.message : 'unknown web-push error';
    return {
      ok: false,
      hardFail: false,
      temporary: true,
      detail: message
    };
  }
}
