import React, { useState, useRef } from 'react';
import './SearchPage.css';

const SearchPage = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const searchInputRef = useRef(null);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchError('Please enter a keyword to search.');
      searchInputRef.current?.focus();
      return;
    }

    if (trimmedQuery.length < 2) {
      setSearchError('Try a slightly longer search (2+ characters).');
      searchInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setSearchError('');

    try {
      // Handle search - you can navigate to search results page or trigger search
      console.log('Searching for:', trimmedQuery);
      // TODO: Implement search functionality
      // For now, just show a message
      setSearchResults([{ type: 'message', text: `Search results for: "${trimmedQuery}"` }]);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchError('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  // Focus input when component mounts
  React.useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <div className="search-page-overlay" onClick={onClose}>
      <div className="search-page-container" onClick={(e) => e.stopPropagation()}>
        <div className="search-page-header">
          <button className="search-page-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Search</h2>
          <div className="search-page-header-placeholder"></div>
        </div>

        <div className="search-page-content">
          <div className="search-page-main">
            <form className="search-page-form" onSubmit={handleSearchSubmit}>
              <div className="search-input-wrapper">
                <span className="search-icon" aria-hidden="true">
                  <i className="fa-solid fa-search"></i>
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="search-page-input"
                  placeholder="Search accounts, videos, hashtags..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchError('');
                  }}
                  aria-label="Search"
                  aria-invalid={Boolean(searchError)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
              {searchError && (
                <div className="search-error-message" role="alert">
                  {searchError}
                </div>
              )}
              <button
                type="submit"
                className="search-submit-btn"
                disabled={!searchQuery.trim() || isSubmitting}
              >
                {isSubmitting ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result, index) => (
                  <div key={index} className="search-result-item">
                    {result.text}
                  </div>
                ))}
              </div>
            )}

            {!searchQuery && (
              <div className="search-placeholder">
                <i className="fa-solid fa-search"></i>
                <p>Search for accounts, videos, hashtags, and more</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;

