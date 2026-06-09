import "server-only";

export type RtkWebhookEventType =
  | "license.created"
  | "license.renewed"
  | "license.expired"
  | "license.suspended"
  | "license.pending";

export interface RtkWebhookEventBase {
  type: RtkWebhookEventType;
  licenseId: string;
  userEmail: string;
  plan: string;
  status: string;
  occurredAt: string;
}

export type RtkWebhookEvent =
  | (RtkWebhookEventBase & { type: "license.created"; mode: string })
  | (RtkWebhookEventBase & { type: "license.renewed"; previousLicenseId?: string })
  | (RtkWebhookEventBase & { type: "license.expired"; expiresAt: string })
  | (RtkWebhookEventBase & { type: "license.suspended"; reason?: string })
  | (RtkWebhookEventBase & { type: "license.pending" });

export interface RtkWebhookHandler {
  readonly name: string;
  handle(event: RtkWebhookEvent): Promise<void>;
}

export interface RtkWebhookDispatchResult {
  dispatched: number;
  failures: Array<{ handler: string; error: string }>;
}

class RtkWebhookRegistry {
  private handlers = new Map<string, RtkWebhookHandler>();

  register(handler: RtkWebhookHandler): void {
    this.handlers.set(handler.name, handler);
  }

  unregister(name: string): void {
    this.handlers.delete(name);
  }

  async dispatch(event: RtkWebhookEvent): Promise<RtkWebhookDispatchResult> {
    const failures: RtkWebhookDispatchResult["failures"] = [];
    let dispatched = 0;

    for (const handler of this.handlers.values()) {
      try {
        await handler.handle(event);
        dispatched += 1;
      } catch (error) {
        failures.push({
          handler: handler.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(
      JSON.stringify({
        service: "rtk-webhook",
        level: failures.length ? "warn" : "info",
        event: event.type,
        licenseId: event.licenseId,
        dispatched,
        failures,
        timestamp: new Date().toISOString(),
      }),
    );

    return { dispatched, failures };
  }
}

export const rtkWebhookRegistry = new RtkWebhookRegistry();

/** Handler interno — pronto para extensão futura (HTTP, fila, etc.) */
export class RtkInternalWebhookHandler implements RtkWebhookHandler {
  readonly name = "internal-log";

  async handle(event: RtkWebhookEvent): Promise<void> {
    console.log(
      JSON.stringify({
        service: "rtk-webhook-internal",
        level: "info",
        ...event,
      }),
    );
  }
}

rtkWebhookRegistry.register(new RtkInternalWebhookHandler());

export function buildWebhookEvent(
  type: "license.created",
  payload: Omit<Extract<RtkWebhookEvent, { type: "license.created" }>, "type" | "occurredAt"> & {
    occurredAt?: string;
  },
): RtkWebhookEvent;
export function buildWebhookEvent(
  type: "license.renewed",
  payload: Omit<Extract<RtkWebhookEvent, { type: "license.renewed" }>, "type" | "occurredAt"> & {
    occurredAt?: string;
  },
): RtkWebhookEvent;
export function buildWebhookEvent(
  type: "license.expired",
  payload: Omit<Extract<RtkWebhookEvent, { type: "license.expired" }>, "type" | "occurredAt"> & {
    occurredAt?: string;
  },
): RtkWebhookEvent;
export function buildWebhookEvent(
  type: "license.suspended",
  payload: Omit<Extract<RtkWebhookEvent, { type: "license.suspended" }>, "type" | "occurredAt"> & {
    occurredAt?: string;
  },
): RtkWebhookEvent;
export function buildWebhookEvent(
  type: "license.pending",
  payload: Omit<Extract<RtkWebhookEvent, { type: "license.pending" }>, "type" | "occurredAt"> & {
    occurredAt?: string;
  },
): RtkWebhookEvent;
export function buildWebhookEvent(
  type: RtkWebhookEventType,
  payload: Omit<RtkWebhookEvent, "type" | "occurredAt"> & { occurredAt?: string },
): RtkWebhookEvent {
  return {
    ...payload,
    type,
    occurredAt: payload.occurredAt ?? new Date().toISOString(),
  } as RtkWebhookEvent;
}
