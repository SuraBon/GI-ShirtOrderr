import AppRoot from './App.jsx';
import './index.css';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');
if (!window.__giOrderRoot || window.__giOrderRootElement !== rootElement) {
  window.__giOrderRoot = createRoot(rootElement);
  window.__giOrderRootElement = rootElement;
}
window.__giOrderRoot.render(<AppRoot />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
