import { memo } from 'react';

const Footer = memo(() => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-6 mt-auto">
      <div className="text-center text-sm text-neutral-500">
        <p>&copy; 2026 TrackSTU Asset System. All rights reserved.</p>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
