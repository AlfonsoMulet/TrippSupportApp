export interface Theme {
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    notification: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    surface: string;
    header: string;
  };
}
