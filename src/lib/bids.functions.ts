import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const bidInput = z.object({
  spotId: z.string().uuid(),
  bidderName: z.string().trim().min(1).max(100),
  bidderEmail: z.string().trim().email().max(255),
  company: z.string().trim().min(1).max(100),
  amount: z.number().int().min(2).max(6),
  logoDataUrl: z.string().max(3_000_000).nullable(),
  logoFilename: z.string().max(200).nullable(),
  origin: z.string().url().max(300),
});

export const submitBid = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bidInput.parse(data))
  .handler(async ({ data }) => {
    const { placeBid } = await import("./bids.server");
    return placeBid(data);
  });
