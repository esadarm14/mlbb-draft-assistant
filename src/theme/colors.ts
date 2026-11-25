export const Colors = {
  background: '#0A0E17',
  surface: '#121927',
  surfaceLight: '#1B263B',
  surfaceBorder: '#23304B',
  
  // Accents
  gold: '#FFB800',
  goldMuted: '#B38100',
  purple: '#8A2BE2',
  purpleMuted: '#4D1580',
  red: '#FF334B',
  redMuted: '#801A26',
  blue: '#0088FF',
  blueMuted: '#004480',
  green: '#00E676',
  greenMuted: '#00733B',

  // Typography
  textPrimary: '#F0F4FC',
  textSecondary: '#8899B5',
  textMuted: '#526380',
  
  // Roles
  roleTank: '#FF8C00',
  roleFighter: '#FF4500',
  roleAssassin: '#9400D3',
  roleMage: '#00BFFF',
  roleMarksman: '#FFD700',
  roleSupport: '#00FF7F',
};

export const ROLE_COLORS: Record<string, string> = {
  Tank: Colors.roleTank,
  Fighter: Colors.roleFighter,
  Assassin: Colors.roleAssassin,
  Mage: Colors.roleMage,
  Marksman: Colors.roleMarksman,
  Support: Colors.roleSupport,
};
