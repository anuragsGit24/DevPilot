import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { ToastProvider } from '@/app/providers/ToastProvider';
import { ProjectDataProvider } from '@/app/providers/ProjectDataProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { AppRoutes } from '@/app/routes';

export function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <ProjectDataProvider>
                <AppRoutes />
              </ProjectDataProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
