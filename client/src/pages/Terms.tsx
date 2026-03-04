export default function Terms() {
  return (
    <div className="py-8 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-10 md:gap-16">
      <header className="flex flex-col gap-4 md:gap-6">
        <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">Legal</span>
        <h1 className="text-3xl md:text-6xl font-serif" data-testid="text-terms-title">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: February 2026</p>
      </header>

      <div className="flex flex-col gap-8 md:gap-10 text-sm md:text-base text-foreground/80 leading-relaxed">
        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Intertexe ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">2. Description of Service</h2>
          <p>
            Intertexe is a fashion discovery platform that provides information about designers and brands, with a focus on material composition and natural fiber usage. We offer browsing, search, a style quiz, personalized recommendations, and a favorites/wishlist feature.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">3. User Accounts</h2>
          <ul className="flex flex-col gap-2 pl-6 list-disc marker:text-muted-foreground">
            <li>You must provide a valid email address and create a password to register.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You agree to provide accurate and current information.</li>
            <li>You must be at least 13 years of age to create an account.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="flex flex-col gap-2 pl-6 list-disc marker:text-muted-foreground">
            <li>Use the Platform for any unlawful purpose.</li>
            <li>Scrape, crawl, or use automated tools to extract data from the Platform without permission.</li>
            <li>Attempt to gain unauthorized access to other users' accounts or our systems.</li>
            <li>Interfere with or disrupt the Platform's functionality.</li>
            <li>Reproduce, distribute, or commercially exploit our content without written consent.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">5. Content & Accuracy</h2>
          <p>
            While we strive to provide accurate and up-to-date information about designers and their material compositions, we make no warranties about the completeness, accuracy, or reliability of this information. Natural fiber percentages and brand details are compiled by our editorial team and may be subject to change.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">6. AI Recommendations</h2>
          <p>
            Our Style Quiz uses artificial intelligence to generate personalized recommendations. These recommendations are for informational purposes only and should not be considered as professional fashion or purchasing advice. Results may vary based on available data.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">7. Intellectual Property</h2>
          <p>
            All content on the Platform — including text, graphics, logos, design elements, and software — is the property of Intertexe or its content suppliers and is protected by applicable intellectual property laws. Designer names and brand information are used for informational purposes.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">8. Limitation of Liability</h2>
          <p>
            Intertexe shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability shall not exceed the amount you have paid us, if any, in the twelve months preceding the claim.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">9. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at our discretion if you violate these terms. You may delete your account at any time by contacting us at{" "}
            <a href="mailto:info@intertexe.com" className="border-b border-foreground hover:text-muted-foreground transition-colors">info@intertexe.com</a>.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">10. Changes to Terms</h2>
          <p>
            We may modify these terms at any time. Continued use of the Platform after changes constitutes acceptance of the revised terms. We will make reasonable efforts to notify users of significant changes.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">11. Contact</h2>
          <p>
            For questions about these terms, please contact us at{" "}
            <a href="mailto:info@intertexe.com" className="border-b border-foreground hover:text-muted-foreground transition-colors">info@intertexe.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
