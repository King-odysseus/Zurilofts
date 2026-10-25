import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Building2, CalendarClock, CalendarDays, ChartNoAxesCombined, MessageCircleMore } from 'lucide-react';

const TABS = [
  { key: 'today', label: 'Today', to: '/host/today', match: (p) => p === '/host/today', icon: CalendarClock },
  { key: 'calendar', label: 'Calendar', to: '/host/calendar', match: (p) => p.startsWith('/host/calendar'), icon: CalendarDays },
  { key: 'listings', label: 'Listings', to: '/host/listings', match: (p) => p.startsWith('/host/listings') || p.startsWith('/host/properties'), icon: Building2 },
  { key: 'messages', label: 'Inbox', to: '/inbox', match: (p) => p.startsWith('/inbox'), icon: MessageCircleMore },
  { key: 'earnings', label: 'Earnings', to: '/host/earnings', match: (p) => p.startsWith('/host/earnings') || p.startsWith('/host/payouts'), icon: ChartNoAxesCombined },
];

export default function HostMobileBottomNav() {
  const location = useLocation();
  useEffect(() => {
    document.body.classList.add('has-host-mobile-nav');
    return () => document.body.classList.remove('has-host-mobile-nav');
  }, []);

  return (
    <nav aria-label="Host workspace" className="fixed inset-x-3 bottom-3 z-40 mx-auto flex min-h-[68px] max-w-[358px] items-center justify-between rounded-full border border-border bg-white/95 px-[9px] pb-[calc(9px+env(safe-area-inset-bottom))] pt-[9px] text-muted shadow-[0_10px_30px_rgba(15,23,42,0.14)] backdrop-blur md:hidden">
      {TABS.map((tab) => {
        const active = tab.match(location.pathname);
        const Icon = tab.icon;
        return <Link key={tab.key} to={tab.to} aria-current={active ? 'page' : undefined} className={`relative flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[9px] font-semibold transition-colors ${active ? 'text-[#0B1F42]' : 'text-[#64748B] hover:text-[#0B1F42]'}`}><Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" /><span className="truncate">{tab.label}</span></Link>;
      })}
    </nav>
  );
}
