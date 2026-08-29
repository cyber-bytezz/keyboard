import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  paths: z.array(z.string().min(1).max(300)).max(80),
});

/** Returns short-lived signed URLs for sponsor logos in the private bucket. */
export const signLogos = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const { signLogoPaths } = await import("./bids.server");
    return signLogoPaths(data.paths);
  });
