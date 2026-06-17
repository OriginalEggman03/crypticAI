export type CreditPackId = "pack_6" | "pack_12";

export interface CreditPack {
  id: CreditPackId;
  credits: number;
  cents: number;
  priceLabel: string;
}

export const CREDIT_PACKS: Record<CreditPackId, CreditPack> = {
  pack_6: {
    id: "pack_6",
    credits: 6,
    cents: 300,
    priceLabel: "$3",
  },
  pack_12: {
    id: "pack_12",
    credits: 12,
    cents: 500,
    priceLabel: "$5",
  },
};

export const CREDIT_PACK_LIST: CreditPack[] = [
  CREDIT_PACKS.pack_6,
  CREDIT_PACKS.pack_12,
];

export function getCreditPack(id: string): CreditPack | null {
  if (id in CREDIT_PACKS) return CREDIT_PACKS[id as CreditPackId];
  return null;
}

export function creditPackButtonLabel(pack: CreditPack): string {
  return `${pack.credits} spins (${pack.priceLabel})`;
}
