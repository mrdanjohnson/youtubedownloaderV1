import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Session from './pages/Session';
import Settings from './pages/Settings';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session/:id" element={<Session />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  );
}

export default App;
