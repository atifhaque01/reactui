import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// "ResizeObserver loop completed with undelivered notifications." (and the
// older "ResizeObserver loop limit exceeded") is a benign browser warning
// commonly triggered by reactflow re-measuring nodes after a layout change
// (e.g. right after adding a member). It does not indicate a real failure, so
// suppress it both for the window error event AND for CRA's dev error overlay,
// which installs its own listener that bypasses stopImmediatePropagation.
const isResizeObserverError = (message?: string) =>
  typeof message === 'string' && message.includes('ResizeObserver loop');

window.addEventListener(
  'error',
  (event) => {
    if (isResizeObserverError(event.message)) {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
    }
  },
  true
);

// CRA's react-error-overlay subscribes to errors very early; hide its overlay
// when the only error is the benign ResizeObserver loop notification.
window.addEventListener('error', (event) => {
  if (!isResizeObserverError(event.message)) {
    return;
  }
  const overlay = document.getElementById('webpack-dev-server-client-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
