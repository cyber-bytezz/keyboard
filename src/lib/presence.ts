import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Live viewer count for the site. Each visitor joins the "site-viewers"
 * presence channel with a random id; the count comes from Presence sync
 * events, so it updates in real time as people open and close the page.
 * No database writes involved.
 */
export function useLiveViewers() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const channel = supabase.channel("site-viewers", {
      config: { presence: { key: id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
