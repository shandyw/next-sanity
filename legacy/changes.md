Redesign the CurvyGirlReviews About page at `/about` using the attached mockup as the layout reference and the existing homepage as the authoritative branding reference.

First inspect the homepage, current About page, shared components, assets, and DESIGN.md. Implement the redesign using the existing stack. Preserve the approved homepage.

**Visual direction**

Make the About page feel like a natural extension of the homepage:

- Reuse the exact existing fonts, font weights, colors, content widths, buttons, header, and footer.
- Use bold sans-serif headlines, warm offwhite backgrounds, and turquoise pill buttons with dark text.
- Use pink and yellow sparingly for hearts, notes, and other decorative details.
- Incorporate the homepage’s white photo borders, slight rotations, handwritten annotations, and torn-paper treatment.
- Keep the layout simple and compact, with intentional spacing.
- Avoid serif fonts, burgundy buttons, large colored panels, black sections, decorative horizontal rules, and excessively tall images.
- Match the mockup’s composition without copying accessibility problems or image-generation artifacts.

**1. Introduction**

Create a balanced two-column desktop layout with text on the left and a photo on the right.

Eyebrow:
“HEY, I’M SHANDY”

H1:
“Size 16–18.
Zero sugarcoating.”

Body:
“I’m not an influencer. I’m a size 16–18 woman who wants clothes that look good, feel good, and actually look like their pictures.

This is my little corner of the internet for honest try-ons, realistic fit notes, and calling out catfish clothes. If something doesn’t work, I’ll tell you.

I’m here to represent real bodies—including mine.”

Actions:
- “Explore the Reviews” links to the existing reviews archive.
- “Shop My Closet” uses the existing configured shopping destination.

Photo treatment:
- Use an existing approved photo of Shandy if available.
- Otherwise retain a clearly identified placeholder; do not represent the generated mockup portrait as Shandy.
- Keep the photo reasonably compact, with a white border, subtle shadow, and slight rotation.
- Add a small yellow note reading “Keeping it real.”
- Add a handwritten annotation reading “Real body. Real opinions.”
- Keep annotations away from the face and body copy.
- Build text and decorative treatments separately from the photo.

**2. What you’ll find here**

Use an H2 and three open columns, without boxed cards or dividers.

01 — Real-life fit
“How it sits, stretches, and feels on a body like mine.”

02 — Honest opinions
“The good, the awkward, and the ‘nothing like the photo.’”

03 — Clothes worth your time
“A closer look before you spend your money.”

Use the homepage’s heading styles and restrained decorative accents. Make meaningful text, including numbers, sufficiently high contrast.

**3. Shared request CTA**

Reuse the homepage’s existing request-banner component:

Heading:
“Your Wishlist. My Fitting Room.”

Copy:
“Eyeing something? Send it my way.”

Button:
“Request a Review”

Preserve the torn-paper background, turquoise tape accents, and clothing-rack imagery where already available. The button must open the existing request form. Reuse the same component and behavior rather than creating a separate form.

**4. Shared header and footer**

Reuse the existing header and newsletter footer without redesigning them. Mark About as the current navigation destination using both visual styling and `aria-current="page"`.

Keep existing social links, newsletter functionality, and shopping URLs.

**Responsive behavior**

- Stack the introduction on mobile in this order: heading, copy, actions, photo.
- Scale headlines fluidly and avoid awkward forced line breaks.
- Stack the three promises on small screens.
- Reduce photo rotation and reposition decorative notes when space is limited.
- Prevent horizontal overflow and excessive whitespace.
- Keep buttons comfortable to tap and text easy to read.

**Accessibility and SEO**

Apply the project-wide accessibility and SEO requirements throughout this work:

- Target WCAG 2.2 AA with semantic HTML, one H1, logical headings, keyboard access, and visible focus states.
- Verify contrast rather than assuming brand colors work for every text size.
- Provide appropriate photo alt text and hide purely decorative graphics from assistive technology.
- Keep meaningful copy as real HTML text.
- Support text enlargement, reduced motion, and mobile reflow.
- Add a unique page title and meta description using the existing SEO system; avoid duplicate metadata.
- Use the correct canonical URL and crawlable internal links.
- Optimize the portrait and reserve its dimensions to prevent layout shifts.
- Do not lazy-load the main portrait if it is the page’s above-the-fold LCP image.
- Preserve accessible behavior in the shared request dialog and newsletter form.

**Implementation and review**

Reuse existing design tokens and components. Keep About-specific styles scoped so they do not change the homepage.

Update DESIGN.md to document the About page patterns while preserving the approved brand decisions.

Review the implemented page at desktop, tablet, and mobile widths. Check keyboard navigation, contrast, text wrapping, photo cropping, links, and the request CTA.

Complete the implementation, then summarize the changes and identify any missing real photo or integration dependencies.

See temp/about.png for reference