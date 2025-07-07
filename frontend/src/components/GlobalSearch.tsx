import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchService, formatSearchResult, type SearchResult } from '../services/searchService';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface GlobalSearchProps {
  onResultClick?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onResultClick,
  placeholder = 'Search leads, campaigns, users...',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchData, isLoading, error } = useQuery({
    queryKey: ['globalSearch', query],
    queryFn: () => SearchService.globalSearch({ query, limit: 10 }),
    enabled: query.length >= 2,
    staleTime: 30000, // 30 seconds
  });

  const { data: suggestions } = useQuery({
    queryKey: ['searchSuggestions', query],
    queryFn: () => SearchService.getSearchSuggestions(query),
    enabled: query.length >= 1 && query.length < 2,
    staleTime: 60000, // 1 minute
  });

  const handleResultClick = useCallback((result: SearchResult) => {
    setIsOpen(false);
    setSelectedIndex(-1);
    onResultClick?.(result);
  }, [onResultClick]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < (searchData?.results.length || 0) - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && searchData?.results[selectedIndex]) {
            handleResultClick(searchData.results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, searchData, handleResultClick]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length >= 1);
    setSelectedIndex(-1);
  };



  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const results = searchData?.results.map(formatSearchResult) || [];

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(query.length >= 1)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2">Searching...</p>
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-red-500">
              <p>Failed to search</p>
            </div>
          )}

          {!isLoading && !error && query.length < 2 && suggestions && suggestions.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <div className="flex items-center">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700">{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && !error && query.length >= 2 && results.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Search Results ({results.length})
              </div>
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={`w-full px-3 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                    index === selectedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <span className="text-lg">{result.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${result.color} bg-opacity-10`}>
                          {result.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {result.description}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-gray-400">
                        <span>{result.formattedDate}</span>
                        {result.metadata?.status && (
                          <>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <span>{String(result.metadata.status)}</span>
                            </span>
                          </>
                        )}
                        {result.score && (
                          <>
                            <span className="mx-1">•</span>
                            <span>Score: {result.score}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && !error && query.length >= 2 && results.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <p>No results found for "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch; 