import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import ScrollToTop from "./components/common/ScrollToTop.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";

function AppGate() {
  const { checkingSession } = useAuth();

  if (checkingSession) {
    return null;
  }

  return <AppRoutes />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppGate />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
