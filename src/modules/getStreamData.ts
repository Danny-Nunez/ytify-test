import { store } from "../lib/store";

export interface AudioStream {
  url: string;
  quality: string;
  mimeType: string;
  codec: string;
  bitrate: number;
  contentLength: string;
}

export interface StreamData {
  title: string;
  uploader: string;
  uploaderUrl: string;
  duration: string;
  audioStreams: AudioStream[];
  relatedStreams: any[];
  captions: any[];
  livestream: boolean;
}

export default async function(
  id: string,
  prefetch: boolean = false
): Promise<Piped | Record<'error' | 'message', string>> {

  const { invidious, piped } = store.api;
  const { hls, fallback } = store.player;

  const fetchDataFromPiped = () => fetch(`/piped/streams/${id}`)
    .then(res => res.json())
    .then(data => {
      if (hls.on ? data.hls : data.audioStreams.length)
        return data;
      else throw new Error(data.message);
    })
    .then(data => {
      // Ensure we have audio streams
      if (!data.audioStreams || data.audioStreams.length === 0) {
        throw new Error('No audio streams found in Piped response');
      }
      
      // Sort audio streams by bitrate (highest first)
      data.audioStreams.sort((a: AudioStream, b: AudioStream) => b.bitrate - a.bitrate);
      
      return data;
    });

  const fetchDataFromInvidious = () => fetch(`/invidious/videos/${id}`)
    .then(res => res.json())
    .then(data => {
      if (data && 'adaptiveFormats' in data)
        return data;
      else throw new Error(data.error);
    })
    .then((data: Invidious) => {
      // Filter audio streams and sort by bitrate
      const audioFormats = data.adaptiveFormats
        .filter((f) => f.type.startsWith('audio'))
        .sort((a, b) => parseInt(b.bitrate) - parseInt(a.bitrate));
      
      // If no audio streams found, throw an error
      if (audioFormats.length === 0) {
        throw new Error('No audio streams found');
      }
      
      return {
        title: data.title,
        uploader: data.author,
        duration: data.lengthSeconds,
        uploaderUrl: data.authorUrl,
        liveStream: data.liveNow,
        captions: data.captions,
        relatedStreams: data.recommendedVideos.map(v => ({
          url: '/watch?v=' + v.videoId,
          title: v.title,
          uploaderName: v.author,
          duration: v.lengthSeconds,
          uploaderUrl: v.authorUrl,
          type: 'stream'
        })),
        videoStreams: data.adaptiveFormats.filter((f) => f.type.startsWith('video')).map(v => ({
          url: v.url,
          quality: v.quality,
          resolution: v.resolution,
          type: v.type
        })),
        audioStreams: audioFormats.map((v) => ({
          bitrate: parseInt(v.bitrate),
          codec: v.encoding,
          contentLength: v.clen || "0",
          quality: Math.floor(parseInt(v.bitrate) / 1024) + ' kbps',
          mimeType: v.type,
          url: v.url
        }))
      };
    });

  const fetchDataFromYtify = () => {
    console.log('Attempting to fetch data from ytify.netlify.app for video ID:', id);
    // Make sure we're using the correct URL format
    const url = `/ytify/streams/${id}`;
    console.log('Fetching from URL:', url);
    return fetch(url)
      .then(res => {
        console.log('ytify.netlify.app response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('ytify.netlify.app response data:', data);
        if (data && data.audioStreams && data.audioStreams.length > 0) {
          // Sort audio streams by bitrate (highest first)
          data.audioStreams.sort((a: AudioStream, b: AudioStream) => b.bitrate - a.bitrate);
          return data;
        } else {
          throw new Error('No audio streams found in Ytify response');
        }
      })
      .catch(error => {
        console.error('Error fetching from ytify.netlify.app:', error);
        throw error;
      });
  };

  const emergency = (e: Error) =>
    (!prefetch && fallback) ?
      fetchDataFromPiped()
        .catch(() => e) : e;

  const useInvidious = (index = 0): Promise<Piped> => fetchDataFromInvidious()
    .catch(e => {
      if (index + 1 === invidious.length)
        return emergency(e);
      else return useInvidious(index + 1);
    });

  const usePiped = (index = 0): Promise<Piped> => fetchDataFromPiped()
    .catch(() => {
      if (index + 1 === piped.length)
        return useInvidious();
      else return usePiped(index + 1);
    });

  const useYtify = (): Promise<Piped> => fetchDataFromYtify()
    .catch(() => {
      return usePiped();
    });

  const useHls = () => Promise
    .allSettled((hls.api.length ? hls.api : piped).map(() => fetchDataFromPiped()))
    .then(res => {
      const ff = res.filter(r => r.status === 'fulfilled');
      hls.manifests.length = 0;

      ff.forEach(r => {
        if (r.value.hls) {
          hls.manifests.push(r.value.hls);
        }
      });

      return ff[0].value || { message: 'No HLS sources are available.' };
    });

  // Try the standard approach first
  try {
    console.log('getStreamData called with usePiped:', store.player.usePiped, 'hls.on:', hls.on);
    
    // Force the use of ytify.netlify.app API for testing
    const forceYtify = true; // Set to true to force using ytify.netlify.app
    if (forceYtify) {
      console.log('Forcing use of ytify.netlify.app API');
      return useYtify();
    }
    
    return hls.on ? useHls() : store.player.usePiped ? useYtify() : useInvidious();
  } catch (error) {
    console.error('Standard approach failed:', error);
    throw error;
  }
}

