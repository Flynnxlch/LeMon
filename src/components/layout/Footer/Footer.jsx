import { memo } from 'react';

const Footer = memo(() => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-6 mt-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-neutral-500">
        <p>&copy; 2026 TrackSTU Asset System. All rights reserved.</p>
        <div className="flex gap-4 mt-2 sm:mt-0">
          <a href="#" className="hover:text-neutral-900 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-neutral-900 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-neutral-900 transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
