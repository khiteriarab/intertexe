export default function Privacy() {
  return (
    <div className="py-8 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-10 md:gap-16">
      <header className="flex flex-col gap-4 md:gap-6">
        <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">Legal</span>
        <h1 className="text-3xl md:text-6xl font-serif" data-testid="text-privacy-title">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: February 2026</p>
      </header>

      <div className="flex flex-col gap-8 md:gap-10 text-sm md:text-base text-foreground/80 leading-relaxed">
        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">1. Introduction</h2>
          <p>
            Intertexe ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you visit our website and use our services.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">2. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul className="flex flex-col gap-2 pl-6 list-disc marker:text-muted-foreground">
            <li><strong className="text-foreground">Account Information:</strong> Email address and password when you create an account.</li>
            <li><strong className="text-foreground">Quiz Responses:</strong> Your material preferences, spending range, and brand selections when you take our Style Quiz.</li>
            <li><strong className="text-foreground">Favorites:</strong> Designers you save to your wishlist.</li>
            <li><strong className="text-foreground">Usage Data:</strong> Pages visited, features used, and general browsing patterns.</li>
          </ul>
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
          <h2 className="text-xl md:text-2xl font-serif text-foreground">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="flex flex-col gap-2 pl-6 list-disc marker:text-muted-foreground">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>Withdraw consent for data processing at any time.</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at <a href="mailto:info@intertexe.com" className="border-b border-foreground hover:text-muted-foreground transition-colors">info@intertexe.com</a>.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">8. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">9. Contact</h2>
          <p>
            If you have any questions about this privacy policy, please contact us at{" "}
            <a href="mailto:info@intertexe.com" className="border-b border-foreground hover:text-muted-foreground transition-colors">info@intertexe.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
