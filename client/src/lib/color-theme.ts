interface ColorSettings {
  themeColor: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
  destructiveColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  mutedTextColor: string;
}

// Convert hex color to HSL values for CSS custom properties
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
}

export function applyColorTheme(settings: ColorSettings) {
  const root = document.documentElement;
  
  console.log('Applying color theme:', settings);
  
  // Apply primary colors
  root.style.setProperty('--primary', `hsl(${hexToHsl(settings.themeColor)})`);
  root.style.setProperty('--primary-foreground', 'hsl(0, 0%, 98%)');
  
  // Apply accent colors
  root.style.setProperty('--accent', `hsl(${hexToHsl(settings.accentColor)})`);
  root.style.setProperty('--accent-foreground', 'hsl(0, 0%, 98%)');
  
  // Apply status colors
  root.style.setProperty('--destructive', `hsl(${hexToHsl(settings.destructiveColor)})`);
  root.style.setProperty('--destructive-foreground', 'hsl(0, 0%, 98%)');
  root.style.setProperty('--warning', `hsl(${hexToHsl(settings.warningColor)})`);
  root.style.setProperty('--warning-foreground', 'hsl(0, 0%, 98%)');
  root.style.setProperty('--success', `hsl(${hexToHsl(settings.successColor)})`);
  root.style.setProperty('--success-foreground', 'hsl(0, 0%, 98%)');
  
  // Apply background colors
  root.style.setProperty('--background', `hsl(${hexToHsl(settings.backgroundColor)})`);
  root.style.setProperty('--card', `hsl(${hexToHsl(settings.cardColor)})`);
  root.style.setProperty('--popover', `hsl(${hexToHsl(settings.cardColor)})`);
  
  // Apply text colors
  root.style.setProperty('--foreground', `hsl(${hexToHsl(settings.textColor)})`);
  root.style.setProperty('--card-foreground', `hsl(${hexToHsl(settings.textColor)})`);
  root.style.setProperty('--popover-foreground', `hsl(${hexToHsl(settings.textColor)})`);
  root.style.setProperty('--muted-foreground', `hsl(${hexToHsl(settings.mutedTextColor)})`);
  
  // Apply secondary colors based on card color
  const cardHsl = hexToHsl(settings.cardColor);
  root.style.setProperty('--secondary', `hsl(${cardHsl})`);
  root.style.setProperty('--secondary-foreground', `hsl(${hexToHsl(settings.textColor)})`);
  
  // Apply muted colors based on background
  const bgHsl = hexToHsl(settings.backgroundColor);
  root.style.setProperty('--muted', `hsl(${bgHsl})`);
  
  // Update info color to match theme
  root.style.setProperty('--info', `hsl(${hexToHsl(settings.themeColor)})`);
  root.style.setProperty('--info-foreground', 'hsl(0, 0%, 98%)');
  
  // Apply border colors (slightly lighter/darker than background)
  const [h, s, lStr] = bgHsl.split(', ');
  const l = parseInt(lStr.replace('%', ''));
  const borderL = l > 50 ? Math.max(l - 10, 0) : Math.min(l + 10, 100);
  root.style.setProperty('--border', `hsl(${h}, ${s}, ${borderL}%)`);
  root.style.setProperty('--input', `hsl(${h}, ${s}, ${borderL}%)`);
  root.style.setProperty('--ring', `hsl(${hexToHsl(settings.themeColor)})`);
  
  console.log('Color theme applied successfully');
}

export function resetToDefaultColors() {
  const root = document.documentElement;
  
  // Reset to default light theme colors
  root.style.setProperty('--primary', 'hsl(207, 72%, 51%)');
  root.style.setProperty('--accent', 'hsl(142, 71%, 45%)');
  root.style.setProperty('--destructive', 'hsl(0, 84%, 60%)');
  root.style.setProperty('--warning', 'hsl(38, 92%, 50%)');
  root.style.setProperty('--background', 'hsl(0, 0%, 100%)');
  root.style.setProperty('--card', 'hsl(0, 0%, 100%)');
  root.style.setProperty('--foreground', 'hsl(240, 10%, 3.9%)');
  root.style.setProperty('--card-foreground', 'hsl(240, 10%, 3.9%)');
  root.style.setProperty('--muted-foreground', 'hsl(240, 3.8%, 46.1%)');
}