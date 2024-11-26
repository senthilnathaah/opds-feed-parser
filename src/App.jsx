import React, { useState } from 'react';
import { Search, Library, Loader2, ArrowLeft } from 'lucide-react';
import { BookCard } from './BookCard';
import { fetchAndParseOPDS } from './opdsParser';

function App() {
  const [feedUrl, setFeedUrl] = useState('');
  const [feedHistory, setFeedHistory] = useState([]);
  const [currentFeed, setCurrentFeed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadFeed = async (url) => {
    setLoading(true);
    setError('');

    try {
      const parsed = await fetchAndParseOPDS(url);
      setFeedHistory(prev => [...prev, parsed]);
      setCurrentFeed(parsed);
      setFeedUrl(url);
    } catch (err) {
      setError('Failed to fetch or parse the OPDS feed. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedUrl) return;
    
    setFeedHistory([]);
    await loadFeed(feedUrl);
  };

  const handleNavigateBack = () => {
    if (feedHistory.length <= 1) return;
    
    const newHistory = feedHistory.slice(0, -1);
    setFeedHistory(newHistory);
    setCurrentFeed(newHistory[newHistory.length - 1]);
  };

  const handleCatalogClick = async (url) => {
    await loadFeed(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className='flex gap-4'>
                <h1 className="text-2xl font-bold text-gray-900">Catalog Name:</h1>
                {currentFeed?.title && (
                  <h2 className="mt-1 text-lg text-black">{currentFeed.title}</h2>
                )}
              </div>
            </div>
            {feedHistory.length > 1 && (
              <button
                onClick={handleNavigateBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto mb-12">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="url"
                  id="feedUrl"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="Enter OPDS feed URL..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-10"
                  required
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="self-end px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Load Catalog'
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-600" />
            <p className="text-gray-600">Loading catalog...</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentFeed?.books.map((book) => (
            <BookCard 
              key={book.id} 
              book={book} 
              onCatalogClick={handleCatalogClick}
            />
          ))}
        </div>

        {!loading && !error && !currentFeed && (
          <div className="text-center text-gray-500 mt-12">
            <Library className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>Enter an OPDS feed URL to start browsing books</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;