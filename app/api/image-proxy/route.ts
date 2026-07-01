import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Parse hostname to validate it's a trusted source
  let urlObj: URL;
  try {
    urlObj = new URL(imageUrl);
  } catch {
    return new NextResponse('Invalid URL format', { status: 400 });
  }

  const allowedHosts = [
    'upload.wikimedia.org',
    'www.artic.edu',
    'artic.edu'
  ];

  if (!allowedHosts.includes(urlObj.hostname)) {
    return new NextResponse('Unauthorized image source host', { status: 403 });
  }

  try {
    // Set appropriate referer based on the host to bypass hotlink protection
    const referer = urlObj.hostname.includes('wikimedia.org') 
      ? 'https://commons.wikimedia.org/' 
      : 'https://www.artic.edu/';

    const response = await fetch(imageUrl, {
      headers: {
        'Referer': referer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Upstream error: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Failed to fetch image', { status: 502 });
  }
}

