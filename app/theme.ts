'use client'
import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: '#F5C518', contrastText: '#0D0D0D' },
    background: { default: '#0D0D0D', paper: '#1A1A1A' },
    text:       { primary: '#E8E8E8', secondary: '#888888' },
    divider:    '#333333',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #333333',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.875rem',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 700 },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: { backgroundColor: '#1A1A1A', border: '1px solid #333333' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#222222',
          '& fieldset': { borderColor: '#333333' },
          '&:hover fieldset': { borderColor: '#555555' },
        },
      },
    },
  },
})

export default theme
