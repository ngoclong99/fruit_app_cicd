import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { checkAuth, checkAdmin } from '../../../services/auth/authMiddleware';
import AuthModal from './Modal/AuthModal';

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly }: Props) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(true);

  const status = adminOnly ? checkAdmin(user) : checkAuth(user);

  if (status === 'forbidden') return <Navigate to="/" replace />;

  if (status === 'unauthenticated') {
    if (showModal) return <AuthModal onClose={() => setShowModal(false)} />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
