export default async (request: Request) => {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Extract the video ID from the path
  const match = path.match(/\/ytify\/streams\/([^\/]+)/);
  if (!match) {
    return new Response('Invalid path', { status: 400 });
  }
  
  const videoId = match[1];
  const targetUrl = `https://ytify.netlify.app/streams/${videoId}`;
  
  try {
    const response = await fetch(targetUrl);
    
    // Clone the response to modify headers
    const modifiedResponse = new Response(response.body, response);
    
    // Add CORS headers
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return modifiedResponse;
  } catch (error) {
    console.error('Error proxying to ytify.netlify.app:', error);
    return new Response('Error fetching data from ytify.netlify.app', { status: 500 });
  }
}; 