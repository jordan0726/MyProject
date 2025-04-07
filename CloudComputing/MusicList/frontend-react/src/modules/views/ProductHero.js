import * as React from 'react';
import Button from '../components/Button';
import Typography from '../components/Typography';
import ProductHeroLayout from './ProductHeroLayout';

export default function ProductHero({ username }) {
  return (
    <ProductHeroLayout
      sxBackground={{
        backgroundColor: '#ff3366', // 純色背景
        backgroundPosition: 'center',
      }}
    >
      <Typography color="inherit" align="center" variant="h2" marked="center">
        Welcome, {username || 'guest'}
      </Typography>
      <Typography
        color="inherit"
        align="center"
        variant="h5"
        sx={{ mb: 4, mt: { xs: 4, sm: 10 } }}
      >
        Discover and manage your favorite music now 🎵
      </Typography>
    </ProductHeroLayout>
  );
}
