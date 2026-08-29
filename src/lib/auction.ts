import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "./keyboard-layout";

export type SponsorSpot = {
  id: string;
  key_code: string;
  label: string;
  tier: Tier;
  base_price: number;
  current_price: number;
  status: "open" | "taken";
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
};

export type PublicBid = {
  id: string;
  spot_id: string;
  company: string;
  amount: number;
  status: "active" | "outbid" | "won" | "pending";
  created_at: string;
};

const SPOT_COLUMNS =
  "id, key_code, label, tier, base_price, current_price, status, sponsor_name, sponsor_logo_url";
const BID_COLUMNS = "id, spot_id, company, amount, status, created_at";

export function useSponsorSpots() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sponsor_spots"],
    queryFn: async (): Promise<SponsorSpot[]> => {
      const { data, error } = await supabase
        .from("sponsor_spots")
        .select(SPOT_COLUMNS)
        .order("current_price", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SponsorSpot[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("auction-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sponsor_spots" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["sponsor_spots"] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["bids"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useSpotBids(spotId: string | null) {
  return useQuery({
    queryKey: ["bids", spotId],
    enabled: Boolean(spotId),
    queryFn: async (): Promise<PublicBid[]> => {
      const { data, error } = await supabase
        .from("bids")
        .select(BID_COLUMNS)
        .eq("spot_id", spotId!)
        .order("amount", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PublicBid[];
    },
  });
}

/** Sponsor logos live in a private bucket, so paths are exchanged for
    short-lived signed URLs before they can be rendered. */
export function useSponsorLogos(spots: SponsorSpot[] | undefined) {
  const paths = Array.from(
    new Set((spots ?? []).map((s) => s.sponsor_logo_url).filter((p): p is string => Boolean(p))),
  ).sort();

  return useQuery({
    queryKey: ["sponsor-logos", paths.join("|")],
    enabled: paths.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<Record<string, string>> => {
      const { signLogos } = await import("./logos.functions");
      return signLogos({ data: { paths } });
    },
  });
}
