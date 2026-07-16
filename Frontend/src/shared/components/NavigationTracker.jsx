// src/shared/components/NavigationTracker.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigationStore } from '@/shared/store/navigationStore';

export function NavigationTracker() {
  const location = useLocation();
  const setCurrentPath = useNavigationStore((s) => s.setCurrentPath);

  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname, setCurrentPath]);

  return null;
}
