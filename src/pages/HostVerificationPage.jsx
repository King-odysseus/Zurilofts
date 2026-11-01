import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';
import IdentityVerificationPanel from '../components/IdentityVerificationPanel.jsx';

// Identity verification inside the host workspace.
//
// The traveller page at /verify-identity exists to unblock a checkout, and it
// ends by sending the reader back to their trips. A host arriving from settings
// is not mid-booking, so this page owns its own exits: back to host settings,
// and no traveller-only links.

export default function HostVerificationPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div>
        <Link to="/host/settings" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-navy">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {t('hostpreview.backToSettings')}
        </Link>
        <p className={`mt-3 ${HOST_EYEBROW}`}>{t('hostpreview.hostWorkspace')}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">{t('hostpreview.identityVerification')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {t('hostpreview.identityVerificationHint')}
        </p>
      </div>

      <HostCard>
        <IdentityVerificationPanel afterSavePath="/host/settings" showTripsLink={false} context="host" />
      </HostCard>
    </div>
  );
}
