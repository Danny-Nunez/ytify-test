export default async () => {
  return new Response('Test edge function working', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}; 