// This is the very first file that runs in the "renderer" process — the part
// of the Electron app that draws the actual window contents (as opposed to
// the "main" process, which manages the app itself, like opening windows and
// talking to the operating system). Think of this file as the ignition switch
// that starts up the visible part of the app.

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // The root component that contains the whole UI.
import './index.css'; // Global styles (colors, fonts, spacing rules) for the app.
import './lib/monaco'; // Sets up the code editor library used by the Editor tab.

// Find the empty <div id="root"> in the HTML page and tell React "this is
// where you're allowed to draw everything." Then render our <App /> component
// into it. <React.StrictMode> is a development helper that double-checks our
// code for common mistakes — it doesn't affect what the user sees.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
