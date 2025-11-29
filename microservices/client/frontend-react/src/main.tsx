import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import UserApp from './UserApp';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';
import './index.css';

function RootRouter() {
  const path = window.location.pathname;

  // Espace admin/enseignant
  if (path.startsWith('/admin')) {
    return <App />;
  }

  // Pages Stripe
  if (path.startsWith('/payment-success')) {
    return <PaymentSuccess />;
  }
  if (path.startsWith('/payment-cancel')) {
    return <PaymentCancel />;
  }

  // Par défaut : Espace utilisateur (parent/étudiant)
  // Ils se connectent d'abord, puis choisissent entre inscription et profil
  return <UserApp />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootRouter />
  </StrictMode>
);
