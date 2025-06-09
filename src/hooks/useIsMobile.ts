import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the current viewport is mobile-sized
 * @param breakpoint - Width in pixels below which the viewport is considered mobile (default: 768)
 * @returns boolean indicating if the current viewport is mobile-sized
 */
const useIsMobile = (breakpoint = 768): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Check on mount and add resize listener
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    // Clean up event listener on unmount
    return () => window.removeEventListener('resize', checkIfMobile);
  }, [breakpoint]);

  return isMobile;
};

export default useIsMobile;
