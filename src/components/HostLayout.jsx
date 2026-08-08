import PropTypes from 'prop-types';
import Navbar from './Navbar.jsx';

// Host workspace shell: the normal client Navbar (which in hosting mode shows
// Today/Calendar/Listings/Messages/Earnings) plus a centred content container.
// Mirrors HostTodayPage's layout so every /host/* page reads as one workspace.
function HostLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {children}
      </main>
    </div>
  );
}

HostLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HostLayout;
