import { Routes, Route, Navigate } from 'react-router-dom';
import BrowsePage, { LIKES_ROUTE } from './pages/BrowsePage';
import LandingPage from './pages/LandingPage';
import DriveStatus from './components/DriveStatus';

export default function App() {
  return (
    <div className="min-h-screen">
      <DriveStatus />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/b" element={<BrowsePage />} />
        <Route path="/b/*" element={<BrowsePage />} />
        <Route path={LIKES_ROUTE} element={<BrowsePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
