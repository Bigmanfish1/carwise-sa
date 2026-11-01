'use client';

import { emptyGarage, exportGarage, importGarage, type Garage } from '@carwise/core';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'carwise.garage.v1';

export interface GarageStore {
  garage: Garage;
  /** false until the saved data has been read, so the page does not flash empty. */
  loaded: boolean;
  /** Set when saved data exists but could not be read. It is left untouched. */
  loadError: string | null;
  /** Set when the browser refuses to save, for example in a private window. */
  saveError: string | null;
  update: (change: (garage: Garage) => Garage) => void;
  replace: (garage: Garage) => void;
  clear: () => void;
}

/**
 * The garage lives only in this browser's localStorage. Nothing is sent to a server. Every
 * storage call is wrapped, because storage can be blocked or throw.
 */
export function useGarage(): GarageStore {
  const [garage, setGarage] = useState<Garage>(emptyGarage);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const result = importGarage(raw);
        if (result.ok) setGarage(result.garage);
        else setLoadError(result.error);
      }
    } catch {
      setLoadError('This browser would not let the page read saved data.');
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    // Never overwrite data we could not read.
    if (!loaded || loadError) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, exportGarage(garage));
      setSaveError(null);
    } catch {
      setSaveError('Your browser blocked saving. Export your data so you do not lose it.');
    }
  }, [garage, loaded, loadError]);

  const update = useCallback((change: (garage: Garage) => Garage) => setGarage(change), []);

  const replace = useCallback((next: Garage) => {
    setLoadError(null);
    setGarage(next);
  }, []);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing saved that we could remove.
    }
    setLoadError(null);
    setGarage(emptyGarage());
  }, []);

  return { garage, loaded, loadError, saveError, update, replace, clear };
}
