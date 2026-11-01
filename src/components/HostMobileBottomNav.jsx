import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useEffect } from 'react';
import { Building2, CalendarClock, CalendarDays, ChartNoAxesCombined, MessageCircleMore } from 'lucide-react';

const TABS = [
  { key: 'today', label: 'mobileNav.today', to: '/host/today', match: (p) => p === '/host/today', icon: CalendarClock },
  { key: 'calendar', label: 'mobileNav.calendar', to: '/host/calendar', match: (p) => p.startsWith('/host/calendar'), icon: CalendarDays },
  { key: 'listings', label: 'mobileNav.listings', to: '/host/listings', match: (p) => p.startsWith('/host/listings'), icon: Building2 },
  { key: 'messages', label: 'mobileNav.inbox', to: '/host/inbox', match: (p) => p.startsWith('/host/inbox'), icon: MessageCircleMore },
  { key: 'earnings', label: 'mobileNav.earnings', to: '/host/earnings', match: (p) => p.startsWith('/host/earnings') || p.startsWith('/host/payouts'), icon: ChartNoAxesCombined },
];

export default function HostMobileBottomNav() {
  const { t } = useLanguage();
  const location = useLocation();
  useEffect(() => {
    document.body.classList.add('has-host-mobile-nav');
    return () => document.body.classList.remove('has-host-mobile-nav');
  }, []);

  return (
    <nav aria-label={t('host.workspace')} className="fixed inset-x-3 bottom-3 z-40 mx-auto flex min-h-[54px] max-w-[358px] items-center justify-between rounded-full border border-border bg-elevated/95 px-[9px] pb-[calc(5px+env(safe-area-inset-bottom))] pt-[5px] text-muted shadow-[0_10px_30px_rgba(15,23,42,0.14)] backdrop-blur md:hidden">
      {TABS.map((tab) => {
        const active = tab.match(location.pathname);
        const Icon = tab.icon;
        return <Link key={tab.key} to={tab.to} aria-current={active ? 'page' : undefined} className={`relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[9px] font-semibold transition-colors ${active ? 'text-[#203565]' : 'text-[#64748B] hover:text-[#203565]'}`}><Icon className="h-4 w-4" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" /><span className="truncate">{t(tab.label)}</span></Link>;
      })}
    </nav>
  );
}
