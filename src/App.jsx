import { ConfigProvider } from './contexts/ConfigContext';
import { MetricsProvider } from './contexts/MetricsContext';
import { TitleBar } from './components/TitleBar/TitleBar';
import { Dashboard } from './components/Dashboard/Dashboard';
import './styles/global.css';

function App() {
  return (
    <ConfigProvider>
      <MetricsProvider>
        <TitleBar />
        <Dashboard />
      </MetricsProvider>
    </ConfigProvider>
  );
}

export default App;
