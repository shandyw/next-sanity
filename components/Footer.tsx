import type { Settings } from '@/lib/types';
import { SocialLinks } from './SocialLinks';
import { SubmissionForm } from './SubmissionForm';
export function Footer({ settings, demo }: { settings: Settings; demo: boolean }) {
  return (
    <footer className="site-footer">
      <div className="container footer-bar">
        <a className="wordmark wordmark--footer" href="/" aria-label="CurvyGirlReviews home">
          <img className="wordmark__icon" src="/img/curvy.png" alt="CurvyGirlReviews Logo" />
          CurvyGirlReviews
        </a>

        <p className="footer-pitch">
          Get new reviews, outfit finds, and honest takes in your inbox.
        </p>

        <SubmissionForm kind="newsletter" />

        <SocialLinks settings={settings} />
      </div>

      <div className="container footer-base">
        <p className="body-sm">
          © {new Date().getFullYear()} CurvyGirlReviews. <a href="/privacy/">Privacy</a>
          {demo ? ' | Sample content for design review.' : ''}
        </p>
        <ul className="footer-base__links">
          <li>
            <a href="/reviews/">Reviews</a>
          </li>
          <li>
            <a href="/my-faves/">My Faves</a>
          </li>
          <li>
            <a href="/shop">Shop</a>
          </li>
          <li>
            <a href="/support">Support the Reviews</a>
          </li>
          <li>
            <a href="/wishlist">Wishlist</a>
          </li>
          <li>
            <a href="/blog">Blog</a>
          </li>

          <li>
            <a
              href="#contactDialog"
              data-open-contact
              aria-haspopup="dialog"
              aria-controls="contactDialog"
            >
              Contact
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
