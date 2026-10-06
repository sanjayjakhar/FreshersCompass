import { useEffect, useRef } from 'react';

/**
 * Custom hook to trap keyboard focus within a modal or drawer dialog,
 * supporting Escape key to close, cycling Tab/Shift+Tab, and restoring focus
 * to the trigger element when the dialog closes.
 */
export function useFocusTrap(isOpen, onClose) {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Remember trigger element to restore focus on close
    triggerRef.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Find all focusable elements
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const getFocusableElements = () => {
      if (!container) return [];
      return Array.from(container.querySelectorAll(focusableSelector)).filter(
        (el) => el.offsetParent !== null && !el.getAttribute('aria-hidden')
      );
    };

    // Auto-focus first focusable element or container
    const initialElements = getFocusableElements();
    if (initialElements.length > 0) {
      initialElements[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusableElements();
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to trigger
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return containerRef;
}

export default useFocusTrap;
