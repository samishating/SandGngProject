import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function Footer() {
  const t = useTranslations('footer');
  const tel = `tel:${t('phone').replace(/[^0-9+]/g, '')}`;

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-col">
          <span className="footer-brand">Hearthline</span>
          <span className="card-body">{t('tagline')}</span>
        </div>
        <div className="footer-col">
          <span className="footer-heading">{t('contact')}</span>
          <a href={tel}>{t('phone')}</a>
          <Link href="/pricing">{t('helpCentre')}</Link>
          <Link href="/pricing">{t('startSession')}</Link>
        </div>
        <div className="footer-col">
          <span className="footer-heading">{t('company')}</span>
          <Link href="/#about">{t('aboutUs')}</Link>
          <Link href="/#services">{t('services')}</Link>
          <Link href="/pricing">{t('plansAndPricing')}</Link>
        </div>
        <div className="footer-col">
          <span className="footer-heading">{t('legal')}</span>
          <a href="#">{t('terms')}</a>
          <a href="#">{t('privacy')}</a>
          <a href="#">{t('refund')}</a>
          <a href="#">{t('security')}</a>
        </div>
      </div>
      <div className="container footer-legal">{t('copyright')}</div>
    </footer>
  );
}
