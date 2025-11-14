import { useEffect } from 'react';

const useOverlayPage = (onClose, { bodyClass, lockScroll = true, enabled = true } = {}) => {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const sidebar = document.querySelector('.sidebar');
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (bodyClass) {
      document.body.classList.add(bodyClass);
      document.documentElement.classList.add(bodyClass);
    }

    if (sidebar) {
      sidebar.classList.add('page-open');
    }

    if (lockScroll) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (bodyClass) {
        document.body.classList.remove(bodyClass);
        document.documentElement.classList.remove(bodyClass);
      }

      if (sidebar) {
        sidebar.classList.remove('page-open');
      }

      if (lockScroll) {
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
      }

      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [bodyClass, enabled, lockScroll, onClose]);
};

export default useOverlayPage;

