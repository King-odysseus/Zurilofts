import PropTypes from 'prop-types';
import Navbar from './Navbar.jsx';
import HostMobileBottomNav from './HostMobileBottomNav.jsx';

// Host workspace shell: the normal client Navbar (which in hosting mode shows
// Today/Calendar/Listings/Messages/Earnings) plus a centred content container.
// Mirrors HostTodayPage's layout so every /host/* page reads as one workspace.
function HostLayout({ children }) {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="mx-auto w-full max-w-[1344px] px-4 pt-24 pb-16 sm:px-6">
        {children}
      </main>
      <HostMobileBottomNav />
    </div>
  );
}

HostLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HostLayout;
