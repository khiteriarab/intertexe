import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "INTERTEXE Privacy Policy — how we collect, use, and safeguard your information.",
  alternates: { canonical: "https://www.intertexe.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="py-8 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-10 md:gap-16">
      <header className="flex flex-col gap-4 md:gap-6">
        <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">Legal</span>
        <h1 className="text-3xl md:text-6xl font-serif" data-testid="text-privacy-title">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: August 2026</p>
      </header>

      <div className="flex flex-col gap-8 md:gap-10 text-sm md:text-base text-foreground/80 leading-relaxed">
        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">1. Introduction</h2>
          <p>
            Intertexe (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you visit our website, use the INTERTEXE iOS app, or use the Chrome extension INTERTEXE: Fabric Scanner.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">2. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul className="flex flex-col gap-2 pl-6 list-disc marker:text-muted-foreground">
            <li><strong className="text-foreground">Account Information:</strong> Email address and password when you create an account.</li>
            <li><strong className="text-foreground">Quiz Responses:</strong> Your material preferences, spending range, and brand selections when you take our Style Quiz.</li>
            <li><strong className="text-foreground">Favorites:</strong> Products and designers you save to your wishlist, including price at save for drop alerts.</li>
            <li><strong className="text-foreground">Scan history:</strong> Fiber composition results, barcodes scanned, and label data you submit through the scanner.</li>
            <li><strong className="text-foreground">Usage Data:</strong> Pages visited, search queries, features used, and general browsing patterns.</li>
            <li><strong className="text-foreground">Device tokens:</strong> If you enable push notifications on iOS, we store your device token to send welcome, price-drop, and re-engagement alerts.</li>
            <li><strong className="text-foreground">Chrome extension saves:</strong> Product-page data you ask INTERTEXE: Fabric Scanner to save (see section 9).</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">Affiliate &amp; commission tracking</h2>
          <p>
            Intertexe participates in affiliate programs. When you click through to a retailer from our links, we may earn a commission on qualifying purchases at no extra cost to you. We log click-out events to improve recommendations and measure platform performance. We do not receive your payment card details.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="flex flex-col gap-2 pl-6 list-disc marker:text-muted-foreground">
            <li>Provide and maintain our services, including personalized designer recommendations.</li>
            <li>Store your preferences and quiz results for a tailored experience.</li>
            <li>Improve our platform, content, and features.</li>
            <li>Communicate with you about your account or our services.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">4. Data Sharing</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share anonymized, aggregated data for analytical purposes. We use third-party services (such as AI recommendation engines) to enhance your experience, and these services process data in accordance with their own privacy policies.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">5. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. Passwords are encrypted and stored securely. However, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">6. Cookies</h2>
          <p>
            We use session cookies to keep you logged in and to remember your preferences. These cookies are essential for the functioning of our service and do not track you across other websites.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">7. Data retention</h2>
          <p>
            Account data is retained while your account is active. Scan history, saved products (including Chrome extension Inspirations), favorites, and retailer click-out records are deleted when you delete your account. Anonymized analytics may be retained longer for service improvement. Cookie consent preferences are stored locally in your browser until you clear them. Extension session tokens in Chrome are removed when you sign out of the extension or uninstall it.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">8. Your rights (including GDPR)</h2>
          <p>
            If you are in the European Economic Area, United Kingdom, or other regions with data protection laws, you have the right to access, rectify, erase, restrict processing, object, and data portability where applicable. You may lodge a complaint with your local supervisory authority.
          </p>
          <p>You have the right to:</p>
          <ul className="flex flex-col gap-2 pl-6 list-disc marker:text-muted-foreground">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request erasure of your account and associated data (&ldquo;right to be forgotten&rdquo;).</li>
            <li>Withdraw consent for data processing at any time.</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at <a href="mailto:info@intertexe.com" className="border-b border-foreground hover:text-muted-foreground transition-colors">info@intertexe.com</a>.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">9. Chrome extension (INTERTEXE: Fabric Scanner)</h2>
          <p>
            This section covers the Chrome extension INTERTEXE: Fabric Scanner. It is the privacy disclosure for that product. Collection is limited to what is needed to scan fabric composition on a product page you choose, save that piece to your INTERTEXE account, show natural-fiber alternatives, and attribute a retailer click you make from the extension.
          </p>

          <h3 className="text-lg font-serif text-foreground pt-2">When the extension reads a retailer page</h3>
          <p>
            The extension does not run on every page you visit. It does not use always-on content scripts. Opening the toolbar icon does not scrape the page. When you click <strong className="text-foreground">Save this page</strong>, the extension injects a script into the active tab and reads product information from that tab only.
          </p>
          <p>
            If you click Save this page while signed out, the extracted product fields are stored on your computer until you finish signing in, then they are sent to INTERTEXE.
          </p>

          <h3 className="text-lg font-serif text-foreground pt-2">Product-page data</h3>
          <p>From the tab you asked to save, the extension may read:</p>
          <ul className="flex flex-col gap-2 pl-6 list-disc marker:text-muted-foreground">
            <li>The page URL (including canonical or Open Graph URL)</li>
            <li>Title, image URL, and meta description</li>
            <li>Structured product data (JSON-LD) such as brand, SKU, price, currency, and listed material</li>
            <li>The retailer hostname</li>
            <li>Visible page text, used only on your device to find a short fiber or composition line (for example “100% silk”). We transmit that short composition line, not a dump of the full page.</li>
          </ul>

          <h3 className="text-lg font-serif text-foreground pt-2">Account authentication</h3>
          <p>
            Sign-in happens on https://www.intertexe.com, not inside a password field in the extension. After you sign in, INTERTEXE gives the extension a short-lived one-time code. The extension stores an access token and refresh token in Chrome’s local storage so you stay signed in. Those tokens identify your INTERTEXE account. The extension can refresh them and can send them to INTERTEXE to save products, load matches, and sign out.
          </p>

          <h3 className="text-lg font-serif text-foreground pt-2">Saved products</h3>
          <p>
            Saved items are stored on INTERTEXE servers as Inspirations (the same list as the iOS app), including the product URL, title, image URL, description, brand, price, currency, composition text, retailer, and that the source was the Chrome extension. We use this to show material context and natural-fiber alternatives (TX Match). After a save, our servers may fetch the product URL again to complete material matching. That server-side fetch is part of providing the save, not background tracking of other sites you browse.
          </p>

          <h3 className="text-lg font-serif text-foreground pt-2">Retailer click attribution</h3>
          <p>
            If you click a match or retailer link in the extension, we record one click-out on your account (product identifier, brand, name, destination URL, price, currency, and that the click came from the Chrome extension). We may earn a commission on qualifying purchases. We do not receive your payment card details from the retailer.
          </p>

          <h3 className="text-lg font-serif text-foreground pt-2">What the extension does not collect</h3>
          <p>
            The extension does not collect your payment card numbers, a history of every site you visit, other open tabs, your location, microphone, or camera. Your password is entered on the INTERTEXE website, not in the extension.
          </p>

          <h3 className="text-lg font-serif text-foreground pt-2">Service providers</h3>
          <p>
            Extension network requests go only to https://www.intertexe.com. That site is hosted by Vercel. Account authentication and saved-product databases are provided by Supabase. After you save a product, INTERTEXE may use an AI provider (currently OpenAI) on our servers to help fill material or match gaps when the retailer page does not list a complete composition. Those providers process data only to operate this service. We do not sell your personal information.
          </p>

          <h3 className="text-lg font-serif text-foreground pt-2">Retention and deletion</h3>
          <p>
            Tokens and any pending save stay in chrome.storage.local until you sign out of the extension or uninstall it. Saved products and click-out records stay with your INTERTEXE account until you delete the item or delete your account (Account settings, or email info@intertexe.com). Account deletion removes saved captures, capture events, and retailer click-outs associated with your user id.
          </p>
          <p>
            If we change how the extension handles data after you install it, we will update this policy and the “Last updated” date. The listing on the Chrome Web Store will point at this URL: https://www.intertexe.com/privacy
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">10. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">11. Contact</h2>
          <p>
            If you have any questions about this privacy policy, please contact us at{" "}
            <a href="mailto:info@intertexe.com" className="border-b border-foreground hover:text-muted-foreground transition-colors">info@intertexe.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
