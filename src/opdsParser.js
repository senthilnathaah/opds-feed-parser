import { XMLParser } from 'fast-xml-parser';

const resolveUrl = (base, path) => {
  try {
    if (!path) return '';
    return new URL(path, base).href;
  } catch {
    return path;
  }
};

const parseLinks = (links, baseUrl) => {
  if (!links) return [];
  const linkArray = Array.isArray(links) ? links : [links];
  
  return linkArray.map((link) => ({
    href: resolveUrl(baseUrl, link['@_href'] || ''),
    rel: link['@_rel'],
    type: link['@_type'],
    title: link['@_title']
  })).filter(link => link.href); // Filter out links without href
};

const getTextContent = (content) => {
  if (!content) return '';
  if (typeof content === 'string') return content.trim();
  if ('#text' in content) return (content['#text'] || '').trim();
  if (typeof content === 'object' && '@_type' in content) return (content['#text'] || '').trim();
  return String(content).trim();
};

const fetchBookDetails = async (bookFeedUrl) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(bookFeedUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/atom+xml,application/xml,text/xml',
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('xml')) {
      throw new Error('Invalid content type');
    }

    const xmlData = await response.text();
    if (!xmlData.trim()) throw new Error('Empty response');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: true,
      textNodeName: "#text",
      parseTagValue: true,
    });
    
    const result = parser.parse(xmlData);
    const feed = result.feed || result.entry;
    if (!feed) throw new Error('Invalid feed structure');
    
    return parseLinks(feed.link, bookFeedUrl);
  } catch (error) {
    console.error('Error fetching book details:', error);
    return [];
  }
};

const parseEntry = async (entry, baseUrl) => {
  const links = parseLinks(entry.link, baseUrl);
  
  // Find the book's detailed OPDS feed link
  const bookFeedLink = links.find(link => 
    (link.type?.includes('application/atom+xml') && link.rel === 'alternate') ||
    link.rel === 'subsection'
  );

  // Fetch detailed book information if available
  let detailedLinks = [];
  if (bookFeedLink?.href) {
    detailedLinks = await fetchBookDetails(bookFeedLink.href);
  }

  // Combine original links with detailed links, removing duplicates
  const allLinks = [...links, ...detailedLinks].filter((link, index, self) =>
    index === self.findIndex((l) => l.href === link.href)
  );

  const downloadLink = allLinks.find(link => 
    (link.type?.includes('application/epub+zip') || 
     link.type?.includes('application/epub')) &&
    !link.rel?.includes('preview')
  );

  const imageLink = allLinks.find(link => 
    (link.type?.startsWith('image/') || 
     link.rel === 'http://opds-spec.org/image' ||
     link.rel === 'http://opds-spec.org/image/thumbnail') &&
    !link.href?.includes('data:')  // Exclude base64 images
  );

  let author = 'Unknown Author';
  if (entry.author) {
    if (typeof entry.author === 'string') {
      author = entry.author;
    } else if (Array.isArray(entry.author)) {
      author = entry.author.map(a => getTextContent(a.name)).join(', ');
    } else if (entry.author.name) {
      author = getTextContent(entry.author.name);
    }
  }

  const summary = getTextContent(entry.summary) || getTextContent(entry.content) || '';

  return {
    id: entry.id || `${baseUrl}-${Date.now()}`,
    title: getTextContent(entry.title) || 'Untitled',
    author,
    summary,
    coverUrl: imageLink?.href,
    downloadUrl: downloadLink?.href,
    published: entry.published,
    updated: entry.updated,
    links: allLinks
  };
};

export async function fetchAndParseOPDS(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/atom+xml,application/xml,text/xml',
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch OPDS feed (HTTP ${response.status})`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('xml')) {
      throw new Error('Invalid content type - Expected XML');
    }

    const xmlData = await response.text();
    if (!xmlData.trim()) {
      throw new Error('Empty OPDS feed');
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: true,
      textNodeName: "#text",
      parseTagValue: true,
    });
    
    const result = parser.parse(xmlData);
    const feed = result.feed;
    
    if (!feed) {
      throw new Error('Invalid OPDS feed format - Missing feed element');
    }

    const entries = feed.entry || [];
    const books = await Promise.all(
      (Array.isArray(entries) ? entries : [entries])
        .map(entry => parseEntry(entry, url))
    );

    return {
      title: getTextContent(feed.title),
      updated: feed.updated,
      books: books.filter(book => book.title !== 'Untitled'),
      links: parseLinks(feed.link, url)
    };
  } catch (error) {
    console.error('Error parsing OPDS feed:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to parse OPDS feed'
    );
  }
}