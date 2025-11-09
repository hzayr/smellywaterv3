import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getRandomPerfumes, searchPerfumes } from '../lib/supabase';

const SearchContext = createContext(undefined);

export function SearchProvider({ children }) {
  const [perfumes, setPerfumes] = useState([]);
  const [results, setResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const initializedRef = useRef(false);

  const loadRandom = useCallback(async (force = false) => {
    if (initializedRef.current && perfumes.length > 0 && !force) return; // already loaded
    try {
      setLoading(true);
      setError('');
      const data = await getRandomPerfumes(10);
      setPerfumes(data || []);
    } catch (e) {
      console.error('Failed to load random perfumes', e);
      setError('Could not load perfumes. Pull to refresh to try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      initializedRef.current = true;
    }
  }, [perfumes.length]);

  useEffect(() => {
    loadRandom();
  }, [loadRandom]);

  const performSearch = useCallback(async (query) => {
    if (!query || !query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    try {
      setSearching(true);
      const data = await searchPerfumes(query.trim());
      setResults(data || []);
    } catch (e) {
      console.error('Search error', e);
    } finally {
      setSearching(false);
    }
  }, []);

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
  };

  const refreshRandom = () => {
    setRefreshing(true);
    loadRandom(true);
  };

  const value = {
    perfumes,
    results,
    searchQuery,
    setSearchQuery,
    loading,
    refreshing,
    searching,
    error,
    performSearch,
    clearSearch,
    refreshRandom,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within a SearchProvider');
  return ctx;
}
