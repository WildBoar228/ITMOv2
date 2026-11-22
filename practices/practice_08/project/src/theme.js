import { createTheme } from '@mui/material/styles';

export default createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#a18aff' },
    secondary: { main: '#00d4a4' },
    success: { main: '#00d4a4' },
    error: { main: '#ff7582' },
    background: { default: '#0f1226', paper: '#1a1f3d' },
    text: { primary: '#eef0ff', secondary: '#b1b7d6' },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontSize: '2rem', fontWeight: 800 },
    h2: { fontSize: '1.5rem', fontWeight: 700 },
    h3: { fontSize: '1.15rem', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  spacing: 8,
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundImage: 'radial-gradient(1000px 500px at 20% -10%, #2a2f6b 0%, #0f1226 55%)' },
        ':focus-visible': { outline: '3px solid #00d4a4', outlineOffset: 4 },
      },
    },
  },
});
