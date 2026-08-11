import { useEffect, useState } from 'react';
import { fetchVersion } from '../api/meta';

let versionPromise = null;

function loadVersion() {
  if (!versionPromise) {
    versionPromise = fetchVersion()
      .then(res => (res && res.data && res.data.version ? res.data.version : null))
      .catch(() => null);
  }
  return versionPromise;
}

export function useVersion() {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    let mounted = true;
    loadVersion().then(v => {
      if (mounted) {
        setVersion(v);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return version ? `v${version}` : null;
}