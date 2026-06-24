export type CreditPackId = "pack_5" | "pack_12";

export interface CreditPack {
  id: CreditPackId;
  credits: number;
  cents: number;
  priceLabel: string;
}

export const CREDIT_PACKS: Record<CreditPackId, CreditPack> = {
  pack_5: {
    id: "pack_5",
    credits: 5,
    cents: 200,
    priceLabel: "£2",
  },
  pack_12: {
    id: "pack_12",
    credits: 12,
    cents: 400,
    priceLabel: "£4",
  },
};

export const CREDIT_PACK_LIST: CreditPack[] = [
  CREDIT_PACKS.pack_5,
  CREDIT_PACKS.pack_12,
];

export function getCreditPack(id: string): CreditPack | null {
  if (id in CREDIT_PACKS) return CREDIT_PACKS[id as CreditPackId];
  return null;
}

export function creditPackButtonLabel(pack: CreditPack): string {
  return `${pack.credits} spins (${pack.priceLabel})`;
}
