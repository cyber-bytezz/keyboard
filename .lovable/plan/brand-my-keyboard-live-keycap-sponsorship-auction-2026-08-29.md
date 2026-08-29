# Brand My Keyboard — live keycap sponsorship auction

A dark, terminal-flavored landing page where sponsors bid on individual keycaps of a custom mechanical keyboard. Winning bidders get their logo on a real keycap that shows up in build-in-public content.

## Look and feel

- Background `#1B1B1D`, text `#EDE6D6`, teal `#2FB8A6` for open spots and CTAs, clay `#C6553B` for taken spots, neutral gray for regular keys.
- JetBrains Mono for headers, Inter for body. Section headers read like filenames: `how_it_works.sh`, `pricing_tiers.json`, `faq.md`.
- Flat and dense — no gradients, no glass. Keycaps get a subtle press/hover translate so they feel like real switches.

## Pages and sections (single page, anchored nav)

1. **Hero** — headline, one-line pitch, the interactive keyboard, funding stats row.
2. **How it works** — pick a keycap, place a bid, ride along.
3. **Pricing tiers** — accent key / home row / enter-shift / spacebar, each with starting price and description.
4. **FAQ** — is this real, how payment works, what happens when outbid, can any brand join.
5. **Footer** — contact and social link.

## The keyboard

- Full 60%-style layout rendered as a grid of keycap elements with correct relative widths (spacebar, enter, shift, tab wider).
- A defined subset of keys are sponsor spots: label, status (open/taken), current price, sponsor name, bid history.
- Clicking a spot opens a detail panel: name, status, current price, sponsor, full bid history, and a "place a bid" button for open spots.
- Rotate-view slider drives a CSS `perspective + rotateX/rotateY` tilt; an auto-spin toggle animates the tilt back and forth.
- On mobile the detail panel stacks below the board and the keyboard scales/scrolls horizontally.

## Funding progress

Stat row with total raised (summed live from taken spots), funding goal, and spots taken / total spots, plus a progress bar filling against the goal.

## Bidding flow

- Bid modal collects bidder name, email, company name, logo upload, and bid amount validated to beat current price by a minimum increment.
- Explains the 20% refundable deposit: the bidder pays 20% of the bid upfront to lock it in; if outbid later, the deposit is refunded automatically.
- After deposit payment succeeds, the bid becomes active, the previous top bid flips to outbid and its deposit is refunded.
- Board updates live for everyone viewing when a new bid lands.

## Technical notes

- **Backend:** Lovable Cloud. Tables: `sponsor_spots` (key id, label, tier, status, current price, sponsor name, logo url) and `bids` (spot id, bidder name/email/company, amount, deposit amount, stripe session id, status active/outbid/won, timestamp). Public read on spots and non-PII bid history via a narrow anon SELECT policy; bidder emails never exposed to the client. Writes go through server functions only. Logo uploads go to a storage bucket. Realtime subscription on `sponsor_spots` and `bids` refreshes the board.
- **Payments:** Stripe Checkout for the 20% deposit, with a webhook route under `/api/public/` confirming payment and promoting the bid. Refunds for outbid deposits issued server-side.
- **Seed data:** the keyboard's sponsor spots and a handful of taken example spots ship in the initial migration so the board is populated on first load.
- Keyboard layout data lives in one config module so spots and tiers stay in sync between the board and pricing section.

## Build order

1. Enable Cloud, create schema + seeded spots.
2. Static page shell, design tokens, fonts, all five sections.
3. Interactive keyboard with tilt, auto-spin, and detail panel.
4. Funding stats and progress bar wired to live data.
5. Enable Stripe payments, then bid modal → Checkout → webhook → outbid refunds and realtime refresh.
