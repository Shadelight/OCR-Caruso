import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Versión visible en la consola del navegador (útil para diagnóstico).
console.log(
  `%cCaruso Tech %cv${__APP_VERSION__}`,
  'color:#2563eb;font-weight:bold',
  'color:#64748b',
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
