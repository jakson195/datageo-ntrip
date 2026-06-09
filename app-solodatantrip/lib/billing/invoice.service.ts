import "server-only";

import { invoiceRepository } from "@/lib/db/repositories/invoice.repository";

/** Provedores fiscais futuros: NFE.io, FocusNFe, PlugNotas */
export type FiscalProvider = "nfeio" | "focusnfe" | "plugnotas" | "internal";

export interface FiscalIssueResult {
  success: boolean;
  nfNumber?: string;
  nfKey?: string;
  externalId?: string;
  error?: string;
}

export interface FiscalProviderAdapter {
  name: FiscalProvider;
  issue(invoiceId: string, payload: Record<string, unknown>): Promise<FiscalIssueResult>;
  cancel(externalId: string): Promise<boolean>;
}

/** Stub interno — emite NF quando provedor externo estiver configurado */
class InternalFiscalAdapter implements FiscalProviderAdapter {
  readonly name: FiscalProvider = "internal";

  async issue(invoiceId: string, _payload: Record<string, unknown>): Promise<FiscalIssueResult> {
    const nfNumber = `NF-${Date.now()}`;
    return {
      success: true,
      nfNumber,
      nfKey: `KEY-${invoiceId.slice(0, 8)}`,
      externalId: `internal-${invoiceId}`,
    };
  }

  async cancel(): Promise<boolean> {
    return true;
  }
}

export class InvoiceService {
  private adapters: Map<FiscalProvider, FiscalProviderAdapter> = new Map([
    ["internal", new InternalFiscalAdapter()],
  ]);

  registerAdapter(adapter: FiscalProviderAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  getProvider(): FiscalProvider {
    const configured = process.env.FISCAL_PROVIDER?.trim().toLowerCase() as FiscalProvider;
    if (configured && this.adapters.has(configured)) return configured;
    return "internal";
  }

  async issueInvoice(invoiceId: string, payload: Record<string, unknown> = {}): Promise<FiscalIssueResult> {
    const provider = this.getProvider();
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      return { success: false, error: `Provedor fiscal "${provider}" não registrado.` };
    }

    await invoiceRepository.updateStatus(invoiceId, "PENDING");

    const result = await adapter.issue(invoiceId, payload);

    if (result.success) {
      await invoiceRepository.updateStatus(invoiceId, "ISSUED", {
        nfNumber: result.nfNumber,
        nfKey: result.nfKey,
        externalId: result.externalId,
        issuedAt: new Date(),
      });
    } else {
      await invoiceRepository.updateStatus(invoiceId, "FAILED");
    }

    return result;
  }
}

export const invoiceService = new InvoiceService();
