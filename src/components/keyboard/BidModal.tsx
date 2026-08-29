import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import type { SponsorSpot } from "@/lib/auction";
import { formatUsd, MAX_BID, MIN_INCREMENT } from "@/lib/keyboard-layout";
import { submitBid } from "@/lib/bids.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function BidModal({
  spot,
  open,
  onOpenChange,
}: {
  spot: SponsorSpot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const minBid = Math.min(Math.max((spot?.current_price ?? 0) + MIN_INCREMENT, 2), MAX_BID);
  const [amount, setAmount] = useState(minBid);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [logo, setLogo] = useState<{ name: string; dataUrl: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const placeBid = useServerFn(submitBid);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setAmount(minBid);
      setLogo(null);
    }
  }, [open, minBid]);

  if (!spot) return null;

  const schema = z.object({
    bidderName: z.string().trim().min(1, "Name is required").max(100),
    bidderEmail: z.string().trim().email("Enter a valid email").max(255),
    company: z.string().trim().min(1, "Company is required").max(100),
    amount: z
      .number()
      .int("Whole dollars only")
      .min(minBid, `Bid must be at least ${formatUsd(minBid)}`)
      .max(MAX_BID, `Bids are capped at ${formatUsd(MAX_BID)}`),
  });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!spot) return;
    const parsed = schema.safeParse({
      bidderName: name,
      bidderEmail: email,
      company,
      amount: Number(amount),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }

    setSubmitting(true);
    try {
      const result = await placeBid({
        data: {
          spotId: spot.id,
          ...parsed.data,
          logoDataUrl: logo?.dataUrl ?? null,
          logoFilename: logo?.name ?? null,
          origin: window.location.origin,
        },
      });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["sponsor_spots"] });
      await queryClient.invalidateQueries({ queryKey: ["bids"] });
      toast.success(
        result.reachedCap
          ? `${formatUsd(result.amount)} — you hit the cap, ${spot.label} is yours.`
          : `You're the top bidder on ${spot.label} at ${formatUsd(result.amount)}.`,
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place the bid");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono-ui text-base">
            bid on {spot.label} <span className="text-muted-foreground">/ {spot.key_code}</span>
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Current price {formatUsd(spot.current_price)}. Minimum next bid{" "}
            {formatUsd(minBid)} — every bid is capped at {formatUsd(MAX_BID)}. Your bid takes the
            cap <span className="font-semibold text-clay">instantly</span> — payment is collected by email
            once the board closes, and you&rsquo;re free if someone outbids you first.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bid-name" className="font-mono-ui text-xs">
                name
              </Label>
              <Input
                id="bid-name"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bid-email" className="font-mono-ui text-xs">
                email
              </Label>
              <Input
                id="bid-email"
                type="email"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bid-company" className="font-mono-ui text-xs">
              company
            </Label>
            <Input
              id="bid-company"
              value={company}
              maxLength={100}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bid-logo" className="font-mono-ui text-xs">
              logo (png/svg, max 2MB)
            </Label>
            <Input
              id="bid-logo"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return setLogo(null);
                if (file.size > MAX_LOGO_BYTES) {
                  toast.error("Logo must be under 2MB");
                  e.target.value = "";
                  return setLogo(null);
                }
                const reader = new FileReader();
                reader.onload = () =>
                  setLogo({ name: file.name, dataUrl: String(reader.result ?? "") });
                reader.readAsDataURL(file);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bid-amount" className="font-mono-ui text-xs">
              bid amount ($2–$6)
            </Label>
            <Input
              id="bid-amount"
              type="number"
              min={minBid}
              max={MAX_BID}
              step={MIN_INCREMENT}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
            <p className="font-mono-ui text-[11px] text-muted-foreground">
              due now: <span className="font-semibold text-clay">{formatUsd(amount)}</span> — refunded if
              you&rsquo;re outbid
            </p>
          </div>

          <Button type="submit" disabled={submitting} className="font-mono-ui w-full text-xs">
            {submitting ? "placing bid…" : `place bid — ${formatUsd(amount)}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
