import { useState, useEffect } from "react";

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastChanged, setLastChanged] = useState<number>(Date.now());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChanged(Date.now());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChanged(Date.now());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, lastChanged };
}
