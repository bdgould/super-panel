import { useState } from 'react';
import { ConfigProvider } from './contexts/ConfigContext';
import { MetricsProvider } from './contexts/MetricsContext';
import { TitleBar } from './components/TitleBar/TitleBar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { SettingsModal } from './components/ConfigModal/SettingsModal';
import './styles/global.css';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <ConfigProvider>
      <MetricsProvider>
        <TitleBar onOpenSettings={() => setIsSettingsOpen(true)} />
        <Dashboard />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </MetricsProvider>
    </ConfigProvider>
  );
}

export default App;
