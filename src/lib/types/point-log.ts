/** Geteilter Typ für Punkte-Historie (Client + Server, kein "use server"). */
export type PointLogEntry = {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  createdAt: string;
  grantedBy: string | null;
  grantedByName: string | null;
  catalogItemId: string | null;
};
