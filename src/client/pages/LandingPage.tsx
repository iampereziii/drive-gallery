import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCoverImage, routeForPath } from '../lib/api';
import { LANDING } from '../lib/content';

export default function LandingPage() {
  const navigate = useNavigate();
  const [cover, setCover] = useState<string | null>(null);
  const [coverLoaded, setCoverLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCoverImage().then((url) => active && setCover(url));
    return () => {
      active = false;
    };
  }, []);

  const enter = () => navigate(routeForPath(''));
  const onPhoto = cover !== null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-blush">
      {cover && (
        <img
          src={cover}
          alt=""
          onLoad={() => setCoverLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            coverLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Darkening wash over a photo for legibility; plain blush when no cover. */}
      <div className={`absolute inset-0 ${onPhoto ? 'bg-black/45' : 'bg-blush'}`} />

      <div className="fade-up relative z-10 flex flex-col items-center px-6 text-center">
        <h1
          className={`font-script text-6xl leading-tight drop-shadow sm:text-7xl ${
            onPhoto ? 'text-white' : 'text-accent'
          }`}
        >
          {LANDING.title}
        </h1>
        <p className={`mt-3 font-serif text-xl sm:text-2xl ${onPhoto ? 'text-white/90' : 'text-accent'}`}>
          {LANDING.message}
        </p>
        <button
          type="button"
          onClick={enter}
          className={`mt-10 rounded-full border px-10 py-2 font-serif text-lg tracking-wide transition ${
            onPhoto
              ? 'border-white/80 text-white hover:bg-white hover:text-black'
              : 'border-accent text-accent hover:bg-accent hover:text-blush'
          }`}
        >
          {LANDING.enterLabel}
        </button>
      </div>
    </div>
  );
}
