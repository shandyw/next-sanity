import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Privacy Policy',
  'How CurvyGirlReviews handles your information.',
  '/privacy',
);
export default function Privacy() {
  return (
    <main id="main" className="privacy-page__main container">
      <header className="inner-hero">
        <div className="inner-hero__paper">
          <p className="inner-hero__eyebrow">CurvyGirlReviews</p>
          <h1 className="inner-hero__title">Privacy Policy</h1>
          <p className="inner-hero__intro">
            How Curvy Girl Reviews collects, uses, and protects personal information, and how to
            contact us about your privacy.
          </p>
        </div>
        <span className="inner-hero__note" aria-hidden="true">
          No pretending.
        </span>
      </header>
      <article className="privacy-content" aria-label="Privacy policy details">
        <p className="privacy-effective">
          Effective Date: <time dateTime="2026-10-03">October 3, 2026</time>
        </p>
        <section aria-labelledby="privacy-section-1">
          <h2 id="privacy-section-1">1. Introduction</h2>
          <p>
            This Privacy Policy describes how Curvy Girl Reviews (“we,” “us,” or “our”) collects,
            uses, and discloses personal information when you visit or use{' '}
            <a href="https://curvygirlreviews.com">https://curvygirlreviews.com</a> (the “Service”).
            By using the Service, you agree to the practices described in this Policy. If you do not
            agree, please do not use the Service.
          </p>
        </section>
        <section aria-labelledby="privacy-section-2">
          <h2 id="privacy-section-2">2. Information We Collect</h2>
          <p>We collect the following categories of personal information:</p>
          <ul>
            <li>Contact information you provide directly, such as name and email address.</li>
            <li>
              Technical data such as IP address, browser type, device identifiers, and pages
              visited.
            </li>
            <li>
              Account information such as username, password (hashed), and profile preferences.
            </li>
            <li>
              Usage data collected through analytics tools to understand how visitors use the site.
            </li>
          </ul>
        </section>
        <section aria-labelledby="privacy-section-3">
          <h2 id="privacy-section-3">3. How We Use Your Information</h2>
          <p>
            We use the information we collect to (a) operate, maintain, and improve the Service; (b)
            respond to your inquiries and provide support; (c) personalise your experience; (d)
            detect, prevent, and address technical issues, fraud, or abuse; (e) comply with legal
            obligations; and (f) communicate with you about updates, security alerts, and
            administrative messages.
          </p>
        </section>
        <section aria-labelledby="privacy-section-4">
          <h2 id="privacy-section-4">4. Cookies and Tracking</h2>
          <p>
            We use cookies and similar tracking technologies to operate the site, remember your
            preferences, and analyse usage. You can control cookies through your browser settings;
            however, disabling them may affect functionality. For a full description of the cookies
            we use, please see our cookie policy.
          </p>
          <p>
            If you use the wishlist, saved item IDs are stored only in your browser. No account is
            created. You can remove them using Clear wishlist or by clearing this site’s browser
            data. The list does not sync across devices or reserve items.
          </p>
        </section>
        <section aria-labelledby="privacy-section-5">
          <h2 id="privacy-section-5">5. Third-Party Services</h2>
          <p>
            We use a number of trusted third-party service providers to operate our site. These
            providers may receive personal data only as necessary to perform their services and are
            contractually required to protect it.
          </p>
          <ul>
            <li>
              Analytics providers (such as Google Analytics or Plausible) to understand site usage.
            </li>
          </ul>
        </section>
        <section aria-labelledby="privacy-section-6">
          <h2 id="privacy-section-6">6. Data Sharing and Disclosure</h2>
          <p>
            We do not sell your personal information. We may share personal information only: (a)
            with service providers acting on our behalf and bound by confidentiality obligations;
            (b) when required by law, regulation, or valid legal process; (c) to protect the rights,
            property, or safety of our users or others; or (d) in connection with a merger,
            acquisition, or sale of assets, in which case we will provide notice before your data is
            transferred.
          </p>
        </section>
        <section aria-labelledby="privacy-section-7">
          <h2 id="privacy-section-7">7. Your Rights</h2>
          <p>
            If you are a California resident, the California Consumer Privacy Act (CCPA), as amended
            by the CPRA, gives you the following rights:
          </p>
          <ul>
            <li>Right to know what personal information we collect, use, disclose, and sell.</li>
            <li>
              Right to delete personal information we have collected from you, subject to certain
              exceptions.
            </li>
            <li>Right to correct inaccurate personal information.</li>
            <li>Right to opt out of the sale or sharing of personal information.</li>
            <li>Right to limit use of sensitive personal information.</li>
            <li>Right to non-discrimination for exercising your privacy rights.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:contact@curvygirlreviews.com">contact@curvygirlreviews.com</a>. We will
            respond within the timeframes required by applicable law.
          </p>
        </section>
        <section aria-labelledby="privacy-section-8">
          <h2 id="privacy-section-8">8. Data Security</h2>
          <p>
            We implement reasonable administrative, technical, and physical safeguards designed to
            protect personal information against unauthorised access, alteration, disclosure, or
            destruction. However, no method of transmission over the Internet or electronic storage
            is completely secure, and we cannot guarantee absolute security.
          </p>
        </section>
        <section aria-labelledby="privacy-section-9">
          <h2 id="privacy-section-9">9. Children&#x27;s Privacy</h2>
          <p>
            Our services are not directed to children under the age of 13. We do not knowingly
            collect personal information from children under 13. If you believe a child has provided
            us with personal information, please contact us and we will take steps to delete it
            promptly.
          </p>
        </section>
        <section aria-labelledby="privacy-section-10">
          <h2 id="privacy-section-10">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will revise the
            “Effective Date” above and, where appropriate, notify you through the Service or by
            email. Your continued use of the Service after the change takes effect constitutes
            acceptance of the updated Policy.
          </p>
        </section>
        <section aria-labelledby="privacy-section-11">
          <h2 id="privacy-section-11">11. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy or our data practices,
            please contact us at:
          </p>
          <address>
            Curvy Girl Reviews
            <br />
            Email: <a href="mailto:contact@curvygirlreviews.com">contact@curvygirlreviews.com</a>
            <br />
            Website: <a href="https://curvygirlreviews.com">https://curvygirlreviews.com</a>
            <br />
            Jurisdiction: United States
          </address>
        </section>
        <p className="privacy-disclaimer">
          <strong>Disclaimer:</strong> This document was generated from a general-purpose template
          and is provided for informational purposes only. It does not constitute legal advice or
          create an attorney-client relationship. Have it reviewed by a qualified attorney licensed
          in your jurisdiction before signing or relying on it.
        </p>
      </article>
    </main>
  );
}
