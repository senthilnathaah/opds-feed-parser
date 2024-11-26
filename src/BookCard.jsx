import React, { useState } from 'react';
import { Download, Book as BookIcon, ExternalLink, Loader2, FolderOpen } from 'lucide-react';

export function BookCard({ book, onCatalogClick }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const catalogLink = book.links.find(link => 
    (link.type?.includes('application/atom+xml') && link.rel === 'alternate') ||
    link.rel === 'subsection'
  );

  const handleDownload = async () => {
    if (!book.downloadUrl) return;
    setDownloadError(null);
    setIsDownloading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(book.downloadUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/epub+zip,application/epub',
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Download failed (HTTP ${response.status})`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('epub')) {
        throw new Error('Invalid file type received');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.title.replace(/[/\\?%*:|"<>]/g, '-')}.epub`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading book:', error);
      setDownloadError(
        error instanceof Error 
          ? error.message 
          : 'Failed to download the book'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const alternativeLinks = book.links.filter(link => 
    (link.type?.includes('application/epub') || link.rel?.includes('acquisition')) && 
    link.href !== book.downloadUrl &&
    !link.rel?.includes('preview')
  );

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-[1.02]">
      <div className="aspect-[2/3] relative bg-gray-100">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '';
              e.currentTarget.classList.add('hidden');
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookIcon className="w-16 h-16 text-gray-400" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-2">{book.title}</h3>
        <p className="text-sm text-gray-600 mb-2">{book.author}</p>
        {book.summary && (
          <p className="text-sm text-gray-500 line-clamp-3 mb-3">{book.summary}</p>
        )}
        <div className="space-y-2">
          {downloadError && (
            <p className="text-sm text-red-600 mb-2">{downloadError}</p>
          )}
          {catalogLink && (
            <button
              onClick={() => onCatalogClick(catalogLink.href)}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Open Catalog</span>
            </button>
          )}
          {book.downloadUrl && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloading ? 'Downloading...' : 'Download EPUB'}</span>
            </button>
          )}
          {alternativeLinks.map((link, index) => (
            <a
              key={index}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{link.title || 'Alternative Download'}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}