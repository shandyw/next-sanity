import { AffiliateDisclosure } from './AffiliateDisclosure';
import { associatesActive } from '@/lib/amazon';
import { SubmissionForm } from './SubmissionForm';
import { SocialLinks } from './SocialLinks';
import type { Settings } from '@/lib/types';
export function Footer({ demo, settings }: { demo: boolean; settings: Settings }) {
  return (
    <footer className="site-footer">
      <div className="container footer-bar">
        <a className="wordmark wordmark--footer" href="/" aria-label="CurvyGirlReviews home">
          <img className="wordmark__icon" src="/img/curvy.png" alt="" />
          CurvyGirlReviews
        </a>

        <p className="footer-pitch">
          Get new reviews, outfit finds, and honest takes in your inbox.
        </p>

        <SubmissionForm kind="newsletter" />
      </div>

      <div className="container">
        <AffiliateDisclosure active={associatesActive(settings)} />
      </div>
      <div className="container footer-base">
        <p className="body-sm">
          © {new Date().getFullYear()} CurvyGirlReviews. <a href="/privacy/">Privacy</a> ·{' '}
          <a href="/disclosures">Disclosures</a>
          {demo ? ' | Sample content for design review.' : ''}
        </p>
        <ul className="footer-base__links">
          <li>
            <a href="/reviews/">Reviews</a>
          </li>
          {/* <li>
            <a href="/my-faves/">My Faves</a>
          </li> */}
          <li>
            <a href="/shop">Shop the Looks</a>
          </li>
          <li>
            <a href="/shop/closet">My Closet</a>
          </li>
          <li>
            <a href="/about">About</a>
          </li>
          <li>
            <a href="/support">Support the Reviews</a>
          </li>
          <li>
            <a href="/wishlist">Saved Items</a>
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
        <SocialLinks settings={settings} className="footer-socials" />
      </div>
    </footer>
  );
}
