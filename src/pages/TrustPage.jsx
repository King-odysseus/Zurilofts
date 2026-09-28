import { Link } from 'react-router-dom';
import IdentityVerificationPanel from '../components/IdentityVerificationPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import '../trust-design.css';

export default function TrustPage() {
  const { user } = useAuth();
  return <div className="op-trust-page" data-openpencil-frame="0:9724">
    <main className="op-trust-wrap">
      <header className="op-trust-hero"><div><p>TRUST &amp; RECOVERY</p><h1>Keep your account safe</h1><span>Identity verification, dispute resolution and payment recovery in one place.</span></div></header>
      <div className="op-trust-layout">
        <aside className="op-trust-sidebar"><div className="op-trust-person"><span>{(user?.firstName || 'G').slice(0, 1).toUpperCase()}</span><div><strong>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Guest'}</strong><small>{user?.email}</small></div></div>
          <nav aria-label="Trust sections"><a href="#identity">Identity verification</a><a href="#disputes">Disputes</a><a href="#payment-recovery">Payment recovery</a><Link to="/profile">Security</Link></nav>
        </aside>
        <div className="op-trust-content">
          <section id="identity" className="op-trust-panel"><IdentityVerificationPanel /></section>
          <section id="disputes" className="op-trust-panel"><h2>Report an issue</h2><p>If something went wrong during a stay, open your booking to contact support and share the details. Your messages and booking history stay together.</p><Link to="/trips">Go to your trips</Link></section>
          <section id="payment-recovery" className="op-trust-panel"><h2>Payment recovery</h2><p>If payment is interrupted, check your booking before trying again. A stay is only confirmed after the payment provider verifies it.</p><div className="op-trust-recovery"><div><span>◷</span><h3>Checking payment</h3><p>We are confirming your payment securely. Keep this page open.</p></div><div><span>◉</span><h3>Payment pending</h3><p>Your provider may still be processing the payment.</p><Link to="/trips">Go to trips</Link></div><div><span>!</span><h3>Payment wasn&apos;t completed</h3><p>No booking is confirmed until the provider verifies payment.</p><Link to="/trips">Review booking</Link></div></div></section>
        </div>
      </div>
    </main>
  </div>;
}
