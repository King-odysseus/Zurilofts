import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const TABS = [
  { key: 'today', label: 'Today', to: '/host/today', match: (p) => p === '/host/today' },
  { key: 'calendar', label: 'Calendar', to: '/host/calendar', match: (p) => p.startsWith('/host/calendar') },
  { key: 'listings', label: 'Listings', to: '/host/listings', match: (p) => p.startsWith('/host/listings') || p.startsWith('/host/properties') },
  { key: 'messages', label: 'Inbox', to: '/inbox', match: (p) => p.startsWith('/inbox') },
  { key: 'earnings', label: 'Earnings', to: '/host/earnings', match: (p) => p.startsWith('/host/earnings') || p.startsWith('/host/payouts') },
];

function Icon({ name, active }) {
  const common = { className: 'h-[18px] w-[18px]', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', 'aria-hidden': true };
  const paths = {
    today: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M8 7V3m8 4V3m-9 4h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M8 12h.01M12 12h.01M16 12h.01" /></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" strokeWidth={active ? 2.2 : 1.8} /><path strokeLinecap="round" strokeWidth={active ? 2.2 : 1.8} d="M16 2v4M8 2v4M3 10h18" /></>,
    listings: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M4 5h16M4 12h16M4 19h16" /><circle cx="8" cy="5" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" /></>,
    messages: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M20 11.5a7.5 7.5 0 01-8 7.5 8.6 8.6 0 01-3.2-.6L4 20l1.6-4.2A7.3 7.3 0 014 11.5 7.5 7.5 0 0112 4a7.5 7.5 0 018 7.5z" /><path strokeLinecap="round" strokeWidth={active ? 2.2 : 1.8} d="M9 12h.01M12 12h.01M15 12h.01" /></>,
    earnings: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M4 19V5m0 14h16" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M7 15l3-4 3 2 5-6" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

export default function HostMobileBottomNav() {
  const location = useLocation();
  useEffect(() => {
    document.body.classList.add('has-host-mobile-nav');
    return () => document.body.classList.remove('has-host-mobile-nav');
  }, []);

  return (
    <nav aria-label="Host workspace" className="host-mobile-bottom-nav fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-[358px] items-center justify-between border border-[#E3E8EF] bg-white/95 text-[#64748B] shadow-[0_10px_30px_rgba(15,23,42,0.14)] backdrop-blur md:hidden">
      {TABS.map((tab) => {
        const active = tab.match(location.pathname);
        return <Link key={tab.key} to={tab.to} aria-current={active ? 'page' : undefined} className={`flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[9px] font-semibold transition-colors ${active ? 'bg-[#EEF4FF] text-[#2563EB]' : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0B1F42]'}`}><Icon name={tab.key} active={active} /><span className="truncate">{tab.label}</span></Link>;
      })}
    </nav>
  );
}
