(function attachYouTubeUtils(globalScope) {
  function cleanVideoId(value) {
    if (!value) return null;
    return value.split(/[?#]/)[0].trim() || null;
  }

  function extractYouTubeVideoId(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, '');

      if (host === 'youtu.be') {
        const shortId = cleanVideoId(parsed.pathname.replace(/^\//, '').split('/')[0]);
        return shortId;
      }

      if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (parsed.pathname === '/watch') {
          return cleanVideoId(parsed.searchParams.get('v'));
        }

        const pathParts = parsed.pathname.split('/').filter(Boolean);
        const embedIndex = pathParts.indexOf('embed');
        if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
          return cleanVideoId(pathParts[embedIndex + 1]);
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  function getYouTubeThumbnailCandidates(videoId) {
    if (!videoId) return [];

    return [
      `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/sddefault.jpg`,
      `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/default.jpg`
    ];
  }

  globalScope.YouTubeUtils = {
    extractYouTubeVideoId,
    getYouTubeThumbnailCandidates
  };
})(window);
