import { safeExternal } from '@/lib/urls';
export function Video({
  url,
  transcript,
  captions,
}: {
  url: string;
  transcript?: string;
  captions?: string;
}) {
  const safe = safeExternal(url);
  if (!safe) return null;
  return (
    <div className="video-player">
      <video controls playsInline preload="metadata" src={safe} aria-label="Fashion review video">
        {captions?.startsWith('/') && (
          <track kind="captions" src={captions} srcLang="en" label="English" default />
        )}
      </video>
      {transcript && (
        <details className="review-detail__video-transcript">
          <summary>Read transcript</summary>
          <p>{transcript}</p>
        </details>
      )}
    </div>
  );
}
