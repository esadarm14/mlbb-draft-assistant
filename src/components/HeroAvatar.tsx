import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Hero } from '../types';
import { Colors, ROLE_COLORS } from '../theme/colors';

interface HeroAvatarProps {
  hero: Hero;
  size?: number;
  showRoleBadge?: boolean;
}

export const HeroAvatar: React.FC<HeroAvatarProps> = ({
  hero,
  size = 44,
  showRoleBadge = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const primaryRole = hero.roles[0] || 'Tank';
  const roleColor = ROLE_COLORS[primaryRole] || Colors.gold;

  const initials = hero.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {!hasError && hero.portraitUrl ? (
        <Image
          source={{ uri: hero.portraitUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setHasError(true)}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.surfaceLight, borderColor: roleColor }]}>
          <Text style={[styles.initials, { fontSize: size * 0.38, color: roleColor }]}>
            {initials}
          </Text>
        </View>
      )}

      {showRoleBadge && (
        <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    backgroundColor: Colors.surfaceLight,
  },
  fallback: {
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '800',
  },
  roleDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
});
