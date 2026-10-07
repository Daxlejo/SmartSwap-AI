import { useNavigate } from 'react-router-dom';
import alexAvatar from '@/assets/avatar-alex.svg';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const ProfileScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center px-margin pt-6 text-center">
      <Avatar src={alexAvatar} alt="Alex Morales" size="xl" verified className="mb-3" />
      <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Alex Morales</h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">alex.morales@smartswap.io</p>
      <Badge variant="primary-subtle" icon="eco" iconFilled className="mb-6">
        14.2 kg CO₂ Ahorrados • Nivel Oro
      </Badge>

      <div className="w-full bg-surface-container-lowest p-space-md rounded-2xl border border-surface-container-high/60 shadow-xs mb-6 text-left">
        <h3 className="font-headline-sm text-[14px] font-bold text-on-surface mb-2">Tu Cuenta</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Perfil verificado mediante documento oficial y depósito en custodia seguro.
        </p>
      </div>

      <Button variant="outline" size="md" fullWidth onClick={() => navigate('/login')}>
        Cerrar Sesión
      </Button>
    </div>
  );
};
