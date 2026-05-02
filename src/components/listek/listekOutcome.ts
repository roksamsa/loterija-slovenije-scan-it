import type { SlipWinningInfo } from "../../lib/parseSlipResponse";

export type OutcomeState = "loading" | "error" | "win" | "lose" | "unknown";

export type WinningLine = {
  name: string;
  value: number;
};

const ACTIVE_HINT = /ACTIVE|AKTIV/i;

export function formatEur(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

export function totalWinningsEur(winnings: SlipWinningInfo[]): number {
  return winnings.reduce((total, item) => total + (typeof item.value === "number" ? item.value : 0), 0);
}

/** Eno vrstico na prikaz (kot na uradni strani) - razbijemo količino. */
export function expandWinningLines(winnings: SlipWinningInfo[]): WinningLine[] {
  return winnings.flatMap((item) => {
    const quantity = item.quantity > 0 ? item.quantity : 1;
    const value = quantity > 0 ? item.value / quantity : item.value;

    return Array.from({ length: quantity }, () => ({
      name: item.name,
      value,
    }));
  });
}

export function slipStatusText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const slipDetails = (payload as { slip_details?: { status?: string } }).slip_details;
  return typeof slipDetails?.status === "string" ? slipDetails.status : null;
}

export function isActiveStatus(status: string | null): boolean {
  return status == null || ACTIVE_HINT.test(status);
}

export function getOutcomeState({
  loading,
  error,
  hasPayload,
  hasWin,
  hasPolja,
  hasMessage,
}: {
  loading: boolean;
  error: string | null | undefined;
  hasPayload: boolean;
  hasWin: boolean;
  hasPolja: boolean;
  hasMessage: boolean;
}): OutcomeState {
  if (loading && !hasPayload) return "loading";
  if (error && !hasPayload) return "error";
  if (hasWin) return "win";
  if (hasPolja || hasPayload || hasMessage) return "lose";
  return "unknown";
}

export function getOutcomeTitle(outcome: OutcomeState): string {
  switch (outcome) {
    case "win":
      return "Čestitamo! Vplačani listek je dobiten!";
    case "lose":
      return "Škoda, tokrat vam ni uspelo!";
    case "loading":
      return "Preverjamo vaš listek ...";
    case "error":
      return "Podatkov trenutno ni mogoče naložiti.";
    case "unknown":
      return "Vnesite potrdilo za preverjanje listka.";
  }
}
