import { useEffect, useState } from 'react';

/** Evento `beforeinstallprompt` (no tipado por la lib DOM estándar). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Botón flotante "Instalar app". Sólo aparece cuando el navegador permite
 * instalar la PWA (evento `beforeinstallprompt`) y se oculta una vez instalada
 * o si la app ya corre como aplicación (display-mode: standalone).
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari expone navigator.standalone
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  const handleClick = async () => {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setDeferred(null);
  };

  return (
    <button className="install-btn" onClick={handleClick} aria-label="Instalar aplicación">
      <span className="install-btn-icon">⬇</span>
      Instalar app
    </button>
  );
}
