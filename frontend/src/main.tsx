import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { DialogProvider } from './context/DialogContext';
import ApiErrorBridge from './shared/errors/ApiErrorBridge';
import './i18n';
import './styles/globals.scss';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <DialogProvider>
        {/* Đăng ký DialogContext.alert vào error-bus cho axios interceptor */}
        <ApiErrorBridge />
        <App />
      </DialogProvider>
    </Provider>
  </StrictMode>
);
