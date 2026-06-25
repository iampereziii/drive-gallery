import { Link } from 'react-router-dom';
import { routeForPath } from '../lib/api';

/** Clickable path trail: Home / 2024 / Trip. */
export default function Breadcrumb({ relPath }: { relPath: string }) {
  const segments = relPath ? relPath.split('/') : [];

  const crumbs = segments.map((name, i) => ({
    name,
    path: segments.slice(0, i + 1).join('/'),
  }));

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-neutral-400">
      <Link to={routeForPath('')} className="hover:text-neutral-100">
        Home
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.path} className="flex items-center gap-1">
          <span className="text-neutral-600">/</span>
          {i === crumbs.length - 1 ? (
            <span className="text-neutral-100">{c.name}</span>
          ) : (
            <Link to={routeForPath(c.path)} className="hover:text-neutral-100">
              {c.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
