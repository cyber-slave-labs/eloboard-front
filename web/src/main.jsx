import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Rankings from './pages/Rankings.jsx';
import Player from './pages/Player.jsx';
import H2H from './pages/H2H.jsx';
import Maps from './pages/Maps.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/p/:id" element={<Player />} />
          <Route path="/vs" element={<H2H />} />
          <Route path="/maps" element={<Maps />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
