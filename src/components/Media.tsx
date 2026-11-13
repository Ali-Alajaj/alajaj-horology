import { useState, type CSSProperties } from 'react';
import files from 'virtual:asset-manifest';

const available = new Set(files);
export const hasAsset = (name: string) => available.has(name);
export const assetUrl = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`;

export type Tone = 'gold' | 'steel' | 'night' | 'sand' | 'leather' | 'green';

interface Props {
  /** file name inside public/assets */
  name: string;
  alt: string;
  tone?: Tone;
  className?: string;
  style?: CSSProperties;
  /** optional looping video shown instead of the still when the file exists */
  video?: string;
  eager?: boolean;
}

/**
 * A photograph slot. Shows public/assets/<name> when the file exists and a
 * designed gradient plate otherwise, so the layout never looks broken.
 */
export default function Media({ name, alt, tone = 'gold', className = '', style, video, eager }: Props) {
  const [failed, setFailed] = useState(false);
  const showVideo = video && hasAsset(video);
  const showImage = !failed && hasAsset(name);
  return (
    <div className={`media media--${tone} ${className}`} style={style} data-asset={name}>
      {showVideo ? (
        <video
          src={assetUrl(video)}
          poster={showImage ? assetUrl(name) : undefined}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          aria-label={alt}
        />
      ) : showImage ? (
        <img
          src={assetUrl(name)}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="media__plate" role="img" aria-label={alt}>
          <span className="media__sweep" />
          <span className="media__dust" />
        </div>
      )}
    </div>
  );
}
