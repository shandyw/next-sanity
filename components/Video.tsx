import { safeVideoUrl, youtubeEmbedUrl } from '@/lib/urls';
export function Video({
  url,
  transcript,
  captions,
}: {
  url: string;
  transcript?: string;
  captions?: string;
}) {
  const safe = safeVideoUrl(url);
  if (!safe) return null;
  const youtube = youtubeEmbedUrl(safe);
  return (
    <div className="video-player">
      {youtube ? (
        <iframe
          title="Fashion review video"
          src={youtube}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <video controls playsInline preload="metadata" src={safe} aria-label="Fashion review video">
          {captions?.startsWith('/') && (
            <track kind="captions" src={captions} srcLang="en" label="English" default />
          )}
        </video>
      )}
      {transcript && (
        <details className="review-detail__video-transcript">
          <summary>Read transcript</summary>
          <p>{transcript}</p>
        </details>
      )}
    </div>
  );
}
