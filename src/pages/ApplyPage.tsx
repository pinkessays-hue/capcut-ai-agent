import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onSuccess: () => void;
}

export default function ApplyPage({ onSuccess: _onSuccess }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    navigate('/creator');
    return null;
  }

  navigate('/register');
  return null;
}
