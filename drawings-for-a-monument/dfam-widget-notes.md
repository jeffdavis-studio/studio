# DfaM Widget — Setup Notes

## What This Is

A self-contained wallet-connect widget that lets DfaM token holders commission paintings directly from jeffgdavis.com. It checks their wallet for DfaM tokens, shows thumbnails, lets them pick one, and redirects to your Squarespace checkout.

## How to Embed in Squarespace

1. Go to the DfaM page on jeffgdavis.com in the Squarespace editor
2. Add a **Code Block** (Insert → Code)
3. Paste the ENTIRE contents of `dfam-widget.html` into the code block
4. Uncheck "Display Source" if that option appears
5. Save and preview

The widget is self-contained — all CSS and JS are inline. No external files needed except the ethers.js CDN (loaded automatically).

## What Jeff Needs to Set Up in Squarespace

### 1. Create the DfaM Commission Product

In your Squarespace Commerce panel:
- **Title:** "Drawings for a Monument — Commission" (or similar)
- **Price:** $500
- **Description:** Brief description of what they're getting
- **Visibility:** Hidden from store navigation — only accessible via direct link
- Note the product URL (e.g., `https://www.jeffgdavis.com/store/p/dfam-commission`)

### 2. Token ID in Orders

The widget appends `?token={tokenId}` to the product URL when redirecting. Squarespace doesn't automatically capture URL params in orders, so you have two options:

**Option A (simplest):** Add a "Special Instructions" or "Additional Info" text field to the product. Tell buyers to confirm their token ID in that field. The widget pre-selects their token, so they know which one.

**Option B (custom):** Add a small script to the product page that reads the `?token=` param and auto-fills a custom form field. Morgan can help with this.

### 3. Update the Product URL in the Widget

In the widget code, find this line near the top of the `<script>` section:

```javascript
const SQUARESPACE_PRODUCT_URL = 'https://www.jeffgdavis.com/store/p/dfam-commission';
```

Replace the URL with your actual Squarespace product URL.

## How to Test

1. Open jeffgdavis.com/dfam (or wherever the widget is embedded)
2. Have MetaMask installed with a wallet that holds a DfaM token
3. Click "Connect Wallet"
4. Your DfaM tokens should appear with thumbnails
5. Click a token to select it
6. Click "Purchase Commission" — it should redirect to the Squarespace product page with `?token=XXXXX` in the URL

## Technical Notes

- Uses ethers.js v6 from CDN for wallet connection and contract reads
- Contract reads go through Cloudflare's public Ethereum RPC (no API key needed)
- Wallet connection uses the injected provider (MetaMask/etc.)
- Only shows DfaM project tokens (project #3, token IDs 3000000–3999999)
- Thumbnails load from Art Blocks media CDN
- No frameworks, no build step, no dependencies beyond ethers.js CDN
