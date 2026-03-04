import { memo } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const ModalWrapper = memo(({ isOpen, onClose, children, className = '', maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Motion.div
          className="absolute inset-0 bg-black/40"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
          onClick={onClose}
          aria-hidden="true"
        />
        <Motion.div
          className={`relative w-full ${maxWidth} bg-white rounded-xl border border-neutral-200 shadow-lg overflow-hidden ${className}`}
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </Motion.div>
      </div>
    </AnimatePresence>
  );
});

ModalWrapper.displayName = 'ModalWrapper';

export default ModalWrapper;
