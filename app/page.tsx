'use client'

import React, { useState, useMemo } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import MyLocationIcon from '@mui/icons-material/MyLocation'

import theme from './theme'
import { supabase } from '@/lib/supabase'
import { buildGraph } from '@/lib/gtfs'
import { findRoute } from '@/lib/routing'
import { TRANSLATIONS, getRouteColor, cleanHeadsign } from '@/lib/constants'
import type { Language, JourneyResult, Leg } from '@/lib/types'

const LANGUAGES: Language[] = ['English', 'Melayu', '中文', 'বাংলা', 'हिन्दी', 'Filipino']
const JPD_MAP_URL = 'https://www.jpd.gov.bn/SiteAssets/Site%20Pages/BRUNEI%20Bus%20Route/New%20Bus%20Route%20English%20Version.jpg'

const filterOptions = createFilterOptions<string>({ matchFrom: 'any' })

const graph = buildGraph()

function RouteBadge({ route }: { route: string }) {
  const color = getRouteColor(route)
  return (
    <Chip
      label={route}
      size='small'
      sx={{
        bgcolor: color,
        color: '#0D0D0D',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: '0.8rem',
        height: 26,
        mr: 1,
        borderRadius: '6px',
        flexShrink: 0,
      }}
    />
  )
}

type T = typeof TRANSLATIONS['English']

function LegDetail({ leg, t }: { leg: Leg; t: T }) {
  const [open, setOpen] = useState(false)
  const noun = leg.stops_count === 1 ? t.stop_singular : t.stop_plural
  const stopsText = t.stops_along.replace('{n}', String(leg.stops_count)).replace('{noun}', noun)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 0.5 }}>
        <RouteBadge route={leg.route} />
        <Box sx={{ flex: 1 }}>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {cleanHeadsign(leg.direction)}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            {t.board_at} <strong style={{ color: '#E8E8E8' }}>{leg.board}</strong>
            {' · '}
            {t.alight_at} <strong style={{ color: '#E8E8E8' }}>{leg.alight}</strong>
          </Typography>
          <Typography variant='caption' color='text.secondary'>{stopsText}</Typography>
        </Box>
        <IconButton size='small' onClick={() => setOpen(o => !o)} sx={{ color: 'text.secondary', mt: -0.5 }}>
          {open ? <ExpandLessIcon fontSize='small' /> : <ExpandMoreIcon fontSize='small' />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ ml: 0.5, mt: 1, mb: 1, pl: 1.5, borderLeft: '2px solid #333', maxHeight: 220, overflowY: 'auto' }}>
          {leg.segment.map((s, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4, borderBottom: i < leg.segment.length - 1 ? '1px solid #2a2a2a' : 'none' }}>
              <Typography variant='caption'>{s.stop_name}</Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary', fontFamily: 'var(--font-mono)', ml: 2 }}>
                #{s.stop_seq}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}

function ResultCard({ result, index, t }: { result: JourneyResult; index: number; t: T }) {
  const label = result.type === 'direct' ? t.direct : t.transfer
  return (
    <Card sx={{ mt: 2, bgcolor: '#1A1A1A' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: 'primary.main', letterSpacing: 1.5, fontWeight: 700 }}>
            {t.option} {index + 1}
          </Typography>
          <Chip label={label} size='small' variant='outlined'
            sx={{ borderColor: 'primary.main', color: 'primary.main', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', height: 20 }} />
        </Box>
        {result.legs.map((leg, j) => (
          <React.Fragment key={j}>
            <LegDetail leg={leg} t={t} />
            {j < result.legs.length - 1 && (
              <Box sx={{ display: 'inline-block', my: 1.5, px: 1, py: 0.25, border: '1px solid', borderColor: 'primary.main', borderRadius: '4px', color: 'primary.main', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: 1 }}>
                ⇄ {t.transfer_at} {result.legs[j + 1].board.toUpperCase()}
              </Box>
            )}
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  )
}

function BetterBusApp() {
  const [lang, setLang]             = useState<Language>('English')
  const [tab, setTab]               = useState(0)
  const [origin, setOrigin]         = useState<string | null>(null)
  const [dest, setDest]             = useState<string | null>(null)
  const [originInput, setOriginInput] = useState('')
  const [destInput, setDestInput]   = useState('')
  const [results, setResults]       = useState<JourneyResult[] | null>(null)
  const [warning, setWarning]       = useState<string | null>(null)
  const [browseStop, setBrowseStop] = useState<string | null>(null)
  const [browseInput, setBrowseInput] = useState('')
  const [locState, setLocState] = useState<'idle' | 'getting' | 'confirming' | 'submitting' | 'success' | 'error'>('idle')
  const [locCoords, setLocCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)

  const t = TRANSLATIONS[lang]
  const { allStops, stopRoutes, tripStops } = graph

  function handleFindRoute() {
    setWarning(null); setResults(null)
    if (!origin || !dest) { setWarning(t.warn_select); return }
    if (origin === dest)  { setWarning(t.warn_same);   return }
    setResults(findRoute(origin.trim().toLowerCase(), dest.trim().toLowerCase(), { stopRoutes, tripStops, allStops }))
  }

  function handleSwap() {
    setOrigin(dest); setDest(origin)
    setOriginInput(destInput); setDestInput(originInput)
    setResults(null); setWarning(null)
  }

  // iOS fires onInputChange with reason='reset' and value='' when the keyboard
  // dismisses — ignore that specific case to prevent typed text disappearing.
  function guardInput(set: (v: string) => void) {
    return (_: React.SyntheticEvent, v: string, reason: string) => {
      if (reason === 'reset' && v === '') return
      set(v)
    }
  }

  function handleSubmitLocation() {
    if (!browseStop) return
    setLocState('getting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setLocState('confirming')
      },
      () => setLocState('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleConfirmLocation() {
    if (!browseStop || !locCoords) return
    setLocState('submitting')
    const stopId = stopRoutes.get(browseStop.trim().toLowerCase())?.[0]?.stop_id ?? ''
    const { error } = await supabase.from('stop_coordinate_submissions').insert({
      stop_id: stopId,
      stop_name: browseStop,
      lat: locCoords.lat,
      lng: locCoords.lng,
      accuracy_meters: locCoords.accuracy,
    })
    setLocState(error ? 'error' : 'success')
  }

  const browseRoutes = useMemo(() => {
    if (!browseStop) return []
    const clean = browseStop.trim().toLowerCase()
    const entries = stopRoutes.get(clean) ?? []
    const seen = new Set<string>()
    return entries
      .filter(e => { if (seen.has(e.route)) return false; seen.add(e.route); return true })
      .sort((a, b) => a.route.localeCompare(b.route))
      .map(e => ({ ...e, total: tripStops.get(e.trip_id)?.length ?? 0 }))
  }, [browseStop, stopRoutes, tripStops])

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth='sm' sx={{ pb: 6 }}>

        {/* Language selector */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2, pb: 1 }}>
          <Select value={lang} onChange={e => setLang(e.target.value as Language)} size='small'
            sx={{ fontSize: '0.8rem', minWidth: 100, color: 'text.secondary', '.MuiOutlinedInput-notchedOutline': { borderColor: '#333' } }}>
            {LANGUAGES.map(l => <MenuItem key={l} value={l} sx={{ fontSize: '0.85rem' }}>{l}</MenuItem>)}
          </Select>
        </Box>

        {/* Hero */}
        <Box sx={{ bgcolor: 'primary.main', color: '#0D0D0D', borderRadius: 3, px: 3, py: 3, mb: 3 }}>
          <Typography variant='h5' sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1 }}>
            🚌 Better Bus Brunei
          </Typography>
          <Typography variant='body2' sx={{ mt: 0.75, opacity: 0.75, fontSize: '0.8rem' }}>{t.subtitle}</Typography>
          <Typography variant='caption' sx={{ display: 'block', mt: 0.75, opacity: 0.7, fontSize: '0.72rem' }}>{t.terminal_notice}</Typography>
        </Box>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, borderBottom: '1px solid #333', '& .MuiTabs-indicator': { bgcolor: 'primary.main' } }}>
          <Tab label={t.tab_plan}   sx={{ color: tab === 0 ? 'primary.main' : 'text.secondary' }} />
          <Tab label={t.tab_browse} sx={{ color: tab === 1 ? 'primary.main' : 'text.secondary' }} />
        </Tabs>

        {/* Plan a Journey */}
        {tab === 0 && (
          <Box>
            <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: 'primary.main', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.65rem' }}>
              {t.origin}
            </Typography>
            <Autocomplete options={allStops} value={origin} inputValue={originInput}
              onChange={(_, v) => { setOrigin(v); setResults(null) }}
              onInputChange={guardInput(setOriginInput)}
              filterOptions={filterOptions}
              renderInput={p => <TextField {...p} placeholder={t.select_stop} size='small' sx={{ mt: 0.75, mb: 1.5 }} />} />

            <Box sx={{ mb: 1.5 }}>
              <Button onClick={handleSwap} startIcon={<SwapVertIcon />} size='small' variant='outlined'
                sx={{ borderColor: '#333', color: 'text.secondary', borderRadius: 2 }}>
                {t.swap}
              </Button>
            </Box>

            <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: 'primary.main', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.65rem' }}>
              {t.destination}
            </Typography>
            <Autocomplete options={allStops} value={dest} inputValue={destInput}
              onChange={(_, v) => { setDest(v); setResults(null) }}
              onInputChange={guardInput(setDestInput)}
              filterOptions={filterOptions}
              renderInput={p => <TextField {...p} placeholder={t.select_stop} size='small' sx={{ mt: 0.75, mb: 2 }} />} />

            <Button fullWidth variant='contained' onClick={handleFindRoute}
              sx={{ bgcolor: 'primary.main', color: '#0D0D0D', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: 1, borderRadius: 2, py: 1.25, '&:hover': { bgcolor: '#e5b800' } }}>
              {t.find_route}
            </Button>

            {warning && (
              <Alert severity='warning' sx={{ mt: 2, bgcolor: '#2a2200', color: '#F5C518', border: '1px solid #3a3100' }}>{warning}</Alert>
            )}

            {results !== null && results.length === 0 && (
              <Card sx={{ mt: 2, bgcolor: '#1A1A1A' }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant='body2' color='text.secondary'>
                    {t.no_route_1}<br />
                    <strong style={{ color: '#E8E8E8' }}>{origin}</strong> → <strong style={{ color: '#E8E8E8' }}>{dest}</strong>
                  </Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>{t.no_route_2}</Typography>
                </CardContent>
              </Card>
            )}

            {results?.map((r, i) => <ResultCard key={i} result={r} index={i} t={t} />)}
          </Box>
        )}

        {/* Where am I? */}
        {tab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <a href={JPD_MAP_URL} target='_blank' rel='noreferrer' style={{ color: '#F5C518', textDecoration: 'none', fontSize: '0.8rem' }}>
                {t.view_map}
              </a>
            </Box>

            <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: 'primary.main', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.65rem' }}>
              {t.stop_label}
            </Typography>
            <Autocomplete options={allStops} value={browseStop} inputValue={browseInput}
              onChange={(_, v) => { setBrowseStop(v); setLocState('idle'); setLocCoords(null) }}
              onInputChange={guardInput(setBrowseInput)}
              filterOptions={filterOptions}
              renderInput={p => <TextField {...p} placeholder={t.select_stop_browse} size='small' sx={{ mt: 0.75, mb: 2 }} />} />

            {browseStop && browseRoutes.length === 0 && (
              <Card sx={{ bgcolor: '#1A1A1A' }}>
                <CardContent><Typography variant='body2' color='text.secondary'>No routes found for this stop.</Typography></CardContent>
              </Card>
            )}

            {browseStop && browseRoutes.length > 0 && (
              <>
                <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: 'primary.main', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.65rem', display: 'block', mb: 1.5 }}>
                  {t.routes_here}
                </Typography>
                <Card sx={{ bgcolor: '#1A1A1A' }}>
                  <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                    {browseRoutes.map((entry, i) => {
                      const seqText = t.stop_seq.replace('{seq}', String(entry.stop_seq)).replace('{total}', String(entry.total))
                      return (
                        <React.Fragment key={i}>
                          {i > 0 && <Divider sx={{ borderColor: '#2a2a2a', my: 1.25 }} />}
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <RouteBadge route={entry.route} />
                            <Box>
                              <Typography variant='body2' sx={{ fontWeight: 600 }}>{cleanHeadsign(entry.direction)}</Typography>
                              <Typography variant='caption' color='text.secondary'>{seqText}</Typography>
                            </Box>
                          </Box>
                        </React.Fragment>
                      )
                    })}
                  </CardContent>
                </Card>
              </>
            )}

            {browseStop && locState === 'idle' && (
              <Button variant='outlined' size='small' startIcon={<MyLocationIcon />}
                onClick={handleSubmitLocation}
                sx={{ mt: 2, borderColor: '#333', color: 'text.secondary', borderRadius: 2, fontSize: '0.75rem' }}>
                Submit my location for this stop
              </Button>
            )}

            {browseStop && (locState === 'getting' || locState === 'submitting') && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <CircularProgress size={14} sx={{ color: 'primary.main' }} />
                <Typography variant='caption' color='text.secondary'>
                  {locState === 'getting' ? 'Getting your location...' : 'Submitting...'}
                </Typography>
              </Box>
            )}

            {browseStop && locState === 'confirming' && locCoords && (
              <Card sx={{ mt: 2, bgcolor: '#1A1A1A' }}>
                <CardContent>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1.5 }}>
                    Submit <strong style={{ color: '#E8E8E8' }}>{locCoords.lat.toFixed(5)}°N, {locCoords.lng.toFixed(5)}°E</strong>{' '}
                    (±{Math.round(locCoords.accuracy)}m) as the location for <strong style={{ color: '#E8E8E8' }}>{browseStop}</strong>?
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size='small' variant='contained' onClick={handleConfirmLocation}
                      sx={{ bgcolor: 'primary.main', color: '#0D0D0D', fontWeight: 700, borderRadius: 2 }}>
                      Confirm
                    </Button>
                    <Button size='small' variant='outlined' onClick={() => setLocState('idle')}
                      sx={{ borderColor: '#333', color: 'text.secondary', borderRadius: 2 }}>
                      Cancel
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {browseStop && locState === 'success' && (
              <Alert severity='success' sx={{ mt: 2, bgcolor: '#0a2a0a', color: '#6EDC8C', border: '1px solid #1a4a1a' }}>
                Thank you! Your location has been submitted.
              </Alert>
            )}

            {browseStop && locState === 'error' && (
              <Alert severity='error' sx={{ mt: 2, bgcolor: '#2a0a0a', color: '#ff8a80', border: '1px solid #4a1a1a' }}>
                Could not get location. Please ensure location access is enabled.
              </Alert>
            )}
          </Box>
        )}

        {/* Footer */}
        <Divider sx={{ mt: 5, mb: 3, borderColor: '#333' }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', lineHeight: 2 }}>
            Data sourced from JPD Brunei · 22 routes · 678 stops<br />
            Routes based on official JPD route cards ·{' '}
            <a href='https://www.jpd.gov.bn/SitePages/PUBLIC%20BUS%20ROUTE.aspx' target='_blank' rel='noreferrer' style={{ color: '#F5C518', textDecoration: 'none' }}>
              Verify at jpd.gov.bn
            </a>
          </Typography>
          <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: '#555', display: 'block', mt: 0.5, mb: 1.5 }}>
            brubah.com/bus · v0.3
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            {[
              { label: '📸 Instagram', href: 'https://www.instagram.com/famahamaf/' },
              { label: '💼 LinkedIn',  href: 'https://www.linkedin.com/in/fahmi-rosli-46709b115/' },
              { label: '📝 Feedback & Stop Locations', href: 'https://forms.gle/uWeqST4tzu5fmEGp8' },
            ].map(({ label, href }) => (
              <a key={label} href={href} target='_blank' rel='noreferrer' style={{ color: '#F5C518', textDecoration: 'none', fontSize: '0.8rem' }}>
                {label}
              </a>
            ))}
          </Box>
        </Box>

      </Container>
    </Box>
  )
}

export default function Page() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BetterBusApp />
    </ThemeProvider>
  )
}
