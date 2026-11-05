import { AffiliateDisclosure } from './AffiliateDisclosure';
import { associatesActive } from '@/lib/amazon';
import { SubmissionForm } from './SubmissionForm';
import { SocialLinks } from './SocialLinks';
import type { Settings } from '@/lib/types';
export function Footer({ demo, settings }: { demo: boolean; settings: Settings }) {
  return (
    <footer className="site-footer">
      <div className="container footer-bar">
        <h2>
          <a className="wordmark wordmark--footer" href="/" aria-label="CurvyGirlReviews home">
            CurvyGirl<br></br>Reviews
          </a>
        </h2>
        <div className="container">
          <ul className="footer-bar__links">
            <li>
              <a href="/reviews/">Reviews</a>
            </li>

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
        </div>
        <div className="container">
          <p className="footer-pitch">
            Get new reviews, outfit finds, and honest takes in your inbox.
          </p>
          <SubmissionForm kind="newsletter" />
          <SocialLinks settings={settings} className="footer-socials" />
        </div>
      </div>

      <div className="container">
        <AffiliateDisclosure active={associatesActive(settings)} />
      </div>
      <div className="container">
        <div className="body-sm flex flex-row justify-between">
          <p>&copy; {new Date().getFullYear()} CurvyGirlReviews.</p>
          <p>
            <a href="/privacy/">Privacy</a>&nbsp;&nbsp;|&nbsp;&nbsp;
            <a href="/disclosures">Disclosures</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
