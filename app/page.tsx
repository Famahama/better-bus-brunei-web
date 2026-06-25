'use client'

import React, { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Autocomplete from '@mui/material/Autocomplete'
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
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'

import theme from './theme'
import { supabase } from '@/lib/supabase'
import type { StopPin } from '@/lib/types'

const StopMap = dynamic(() => import('@/components/StopMap'), { ssr: false })
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false })
import { buildGraph } from '@/lib/gtfs'
import { findRoute } from '@/lib/routing'
import { TRANSLATIONS, getRouteColor, cleanHeadsign, stopFilterOptions, normalizeStopSearch, CHANGELOG } from '@/lib/constants'
import { distanceKm } from '@/lib/geo'
import type { Language, JourneyResult, Leg, CommunityPost } from '@/lib/types'

const LANGUAGES: Language[] = ['English', 'Melayu', '中文', 'বাংলা', 'हिन्दी', 'Filipino']
const JPD_MAP_URL = 'https://www.jpd.gov.bn/SiteAssets/Site%20Pages/BRUNEI%20Bus%20Route/New%20Bus%20Route%20English%20Version.jpg'

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

function LegDetail({ leg, t, shadedStops }: { leg: Leg; t: T; shadedStops: Set<string> }) {
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
            {t.board_at} <strong style={{ color: '#E8E8E8' }}>{leg.board}</strong>{shadedStops.has(leg.board) ? ' 🌂' : ''}
            {' · '}
            {t.alight_at} <strong style={{ color: '#E8E8E8' }}>{leg.alight}</strong>{shadedStops.has(leg.alight) ? ' 🌂' : ''}
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

function ResultCard({ result, index, t, shadedStops }: { result: JourneyResult; index: number; t: T; shadedStops: Set<string> }) {
  const label = result.type === 'direct' ? t.direct : t.transfer
  const trips = result.type === 'direct' ? 1 : 2
  return (
    <Card sx={{ mt: 2, bgcolor: '#1A1A1A' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: 'primary.main', letterSpacing: 1.5, fontWeight: 700 }}>
            {t.option} {index + 1}
          </Typography>
          <Chip label={label} size='small' variant='outlined'
            sx={{ borderColor: 'primary.main', color: 'primary.main', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', height: 20 }} />
        </Box>
        <Divider sx={{ borderColor: '#2a2a2a', mb: 2 }} />
        {result.legs.map((leg, j) => (
          <React.Fragment key={j}>
            <LegDetail leg={leg} t={t} shadedStops={shadedStops} />
            {j < result.legs.length - 1 && (
              <Box sx={{ display: 'inline-block', my: 1.5, px: 1, py: 0.25, border: '1px solid', borderColor: 'primary.main', borderRadius: '4px', color: 'primary.main', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: 1 }}>
                ⇄ {t.transfer_at} {result.legs[j + 1].board.toUpperCase()}
              </Box>
            )}
          </React.Fragment>
        ))}
        <Divider sx={{ borderColor: '#2a2a2a', mt: 2, mb: 1.5 }} />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {[
            { label: t.fare_adult,  amount: `BND ${(1.00 * trips).toFixed(2)}` },
            { label: t.fare_senior, amount: `BND ${(0.50 * trips).toFixed(2)}` },
            { label: t.fare_child,  amount: `BND ${(0.50 * trips).toFixed(2)}` },
            { label: t.fare_infant, amount: t.fare_free },
          ].map(({ label, amount }) => (
            <Box key={label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant='caption' sx={{ color: '#555', fontSize: '0.65rem', lineHeight: 1.2 }}>{label}</Typography>
              <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: '#888', fontSize: '0.72rem', fontWeight: 600 }}>{amount}</Typography>
            </Box>
          ))}
        </Box>
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
  const [shadedStops, setShadedStops] = useState<Set<string>>(new Set())
  const [pins, setPins] = useState<StopPin[]>([])
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([])
  const [favourites, setFavourites] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<Array<{ origin: string; dest: string }>>([])

  const [adoptStopName, setAdoptStopName] = useState('')
  const [adoptStopCode, setAdoptStopCode] = useState('')
  const [adoptNickname, setAdoptNickname] = useState('')
  const [adoptShade, setAdoptShade] = useState<boolean | null>(null)
  const [adoptCoords, setAdoptCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [adoptPhoto, setAdoptPhoto] = useState<File | null>(null)
  const [adoptPhotoPreview, setAdoptPhotoPreview] = useState<string | null>(null)
  const [adoptLocState, setAdoptLocState] = useState<'idle' | 'getting' | 'error'>('idle')
  const [adoptLocateTrigger, setAdoptLocateTrigger] = useState(0)
  const [adoptState, setAdoptState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const t = TRANSLATIONS[lang]
  const { allStops, stopRoutes, tripStops } = graph

  function handleFindRoute() {
    setWarning(null); setResults(null)
    if (!origin || !dest) { setWarning(t.warn_select); return }
    if (origin === dest)  { setWarning(t.warn_same);   return }
    const found = findRoute(origin.trim().toLowerCase(), dest.trim().toLowerCase(), { stopRoutes, tripStops, allStops })
    setResults(found)
    if (found.length > 0) saveRecentSearch(origin, dest)
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

  const isServiceClosed = useMemo(() => {
    const bruneHour = (new Date().getUTCHours() + 8) % 24
    return bruneHour < 6 || bruneHour >= 18
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('betterbus_favorites')
    if (stored) setFavourites(JSON.parse(stored))
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('betterbus_recent')
    if (stored) setRecentSearches(JSON.parse(stored))
  }, [])

  function toggleFavourite(stop: string) {
    setFavourites(prev => {
      const next = prev.includes(stop) ? prev.filter(s => s !== stop) : [...prev, stop]
      localStorage.setItem('betterbus_favorites', JSON.stringify(next))
      return next
    })
  }

  function saveRecentSearch(orig: string, dst: string) {
    setRecentSearches(prev => {
      const filtered = prev.filter(r => !(r.origin === orig && r.dest === dst))
      const next = [{ origin: orig, dest: dst }, ...filtered].slice(0, 3)
      localStorage.setItem('betterbus_recent', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    supabase.from('adopted_stops')
      .select('stop_id, stop_code, stop_name, nickname, stop_lat, stop_lon, has_shade, photo_url')
      .then(({ data }) => {
        if (!data || data.length === 0) return

        const votes: Record<string, { yes: number; no: number }> = {}
        for (const row of data) {
          if (row.has_shade === null) continue
          if (!votes[row.stop_name]) votes[row.stop_name] = { yes: 0, no: 0 }
          if (row.has_shade) votes[row.stop_name].yes++
          else votes[row.stop_name].no++
        }
        const shaded = new Set<string>()
        for (const [name, v] of Object.entries(votes)) {
          if (v.yes > v.no) shaded.add(name)
        }
        setShadedStops(shaded)

        const grouped: Record<string, { stop_id: string; stop_name: string; stop_code?: string; nickname?: string; has_shade: boolean | null; photo_url: string | null; lats: number[]; lngs: number[] }> = {}
        for (const row of data) {
          const key = row.stop_code || row.stop_name
          if (!grouped[key]) {
            grouped[key] = { stop_id: row.stop_id ?? '', stop_name: row.stop_name, stop_code: row.stop_code ?? undefined, nickname: row.nickname ?? undefined, has_shade: row.has_shade, photo_url: row.photo_url, lats: [], lngs: [] }
          }
          grouped[key].lats.push(row.stop_lat)
          grouped[key].lngs.push(row.stop_lon)
          grouped[key].nickname = row.nickname ?? grouped[key].nickname
          grouped[key].photo_url = row.photo_url ?? grouped[key].photo_url
          grouped[key].has_shade = row.has_shade ?? grouped[key].has_shade
        }
        setPins(Object.values(grouped).map(g => ({
          stop_id: g.stop_id,
          stop_name: g.stop_name,
          stop_code: g.stop_code,
          nickname: g.nickname,
          has_shade: g.has_shade,
          photo_url: g.photo_url,
          lat: g.lats.reduce((a, b) => a + b, 0) / g.lats.length,
          lng: g.lngs.reduce((a, b) => a + b, 0) / g.lngs.length,
        })))
      })
  }, [])

  useEffect(() => {
    supabase.from('community_posts')
      .select('id, platform, post_url, image_url, caption, credit_name')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setCommunityPosts(data) })
  }, [])

  function handleAdoptGetLocation() {
    setAdoptLocState('getting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAdoptCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setAdoptLocateTrigger(n => n + 1)
        setAdoptLocState('idle')
      },
      () => setAdoptLocState('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function handleAdoptPhotoChange(file: File | null) {
    setAdoptPhoto(file)
    setAdoptPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleAdoptSubmit() {
    if (!adoptStopName.trim() || !adoptStopCode.trim() || !adoptCoords) return
    setAdoptState('submitting')

    let photoUrl: string | null = null
    if (adoptPhoto) {
      const ext = adoptPhoto.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('stop-photos').upload(path, adoptPhoto)
      if (!uploadError) {
        photoUrl = supabase.storage.from('stop-photos').getPublicUrl(path).data.publicUrl
      }
    }

    const stopId = stopRoutes.get(adoptStopName.trim().toLowerCase())?.[0]?.stop_id ?? null

    const { error } = await supabase.from('adopted_stops').insert({
      stop_id: stopId,
      stop_code: adoptStopCode.trim(),
      stop_name: adoptStopName.trim(),
      nickname: adoptNickname.trim() || null,
      stop_lat: adoptCoords.lat,
      stop_lon: adoptCoords.lng,
      has_shade: adoptShade,
      photo_url: photoUrl,
    })

    if (!error) {
      setShadedStops(prev => {
        if (adoptShade === null) return prev
        const updated = new Set(prev)
        if (adoptShade) updated.add(adoptStopName.trim())
        else updated.delete(adoptStopName.trim())
        return updated
      })
      setPins(prev => [...prev, {
        stop_id: stopId ?? '',
        stop_name: adoptStopName.trim(),
        stop_code: adoptStopCode.trim(),
        nickname: adoptNickname.trim() || undefined,
        has_shade: adoptShade,
        photo_url: photoUrl,
        lat: adoptCoords.lat,
        lng: adoptCoords.lng,
      }])
      setAdoptStopName(''); setAdoptStopCode(''); setAdoptNickname('')
      setAdoptShade(null); setAdoptCoords(null); handleAdoptPhotoChange(null)
    }
    setAdoptState(error ? 'error' : 'success')
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

  const adoptDuplicate = useMemo(() => {
    const nameNorm = normalizeStopSearch(adoptStopName.trim())
    for (const p of pins) {
      const nameMatch = nameNorm.length > 2 && normalizeStopSearch(p.stop_name) === nameNorm
      const close = adoptCoords && distanceKm([adoptCoords.lat, adoptCoords.lng], [p.lat, p.lng]) <= 0.03
      if (nameMatch || close) return p
    }
    return null
  }, [adoptStopName, adoptCoords, pins])

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
          <Typography variant='caption' sx={{ display: 'block', mt: 0.25, opacity: 0.65, fontSize: '0.72rem' }}>🕐 {t.service_hours}</Typography>
        </Box>

        {/* Disclaimer */}
        <Box sx={{ bgcolor: '#1a1a00', border: '1px solid #3a3100', borderRadius: 2, px: 2, py: 1.5, mb: 3 }}>
          <Typography variant='caption' sx={{ color: '#F5C518', display: 'block', lineHeight: 1.6, fontSize: '0.72rem' }}>
            📋 {t.disclaimer}
          </Typography>
        </Box>

        {/* Tabs */}
        <Tabs orientation='vertical' value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3, width: '100%', '& .MuiTabs-indicator': { display: 'none' }, '& .MuiTabs-flexContainer': { gap: 1 },
          }}>
          {[t.tab_plan, t.tab_browse, t.tab_adopt, t.tab_whatsnew, t.tab_community].map((label, i) => (
            <Tab key={label} label={label} sx={{
              width: '100%', alignItems: 'flex-start', justifyContent: 'flex-start', textTransform: 'none',
              borderRadius: 2, border: '1px solid', borderColor: tab === i ? 'primary.main' : '#333',
              bgcolor: tab === i ? 'primary.main' : '#1A1A1A', color: tab === i ? '#0D0D0D !important' : 'text.secondary',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', minHeight: 44, py: 1,
            }} />
          ))}
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
              filterOptions={stopFilterOptions}
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
              filterOptions={stopFilterOptions}
              renderInput={p => <TextField {...p} placeholder={t.select_stop} size='small' sx={{ mt: 0.75, mb: 2 }} />} />

            {recentSearches.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                  {t.recent}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {recentSearches.map((r, i) => (
                    <Chip key={i} size='small'
                      label={`${r.origin} → ${r.dest}`}
                      onClick={() => { setOrigin(r.origin); setDest(r.dest); setOriginInput(r.origin); setDestInput(r.dest); setResults(null); setWarning(null) }}
                      sx={{ bgcolor: '#1A1A1A', color: 'text.secondary', border: '1px solid #333', fontSize: '0.7rem', cursor: 'pointer', maxWidth: 280, '.MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Button fullWidth variant='contained' onClick={handleFindRoute}
              sx={{ bgcolor: 'primary.main', color: '#0D0D0D', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: 1, borderRadius: 2, py: 1.25, '&:hover': { bgcolor: '#e5b800' } }}>
              {t.find_route}
            </Button>

            {isServiceClosed && (
              <Alert severity='warning' sx={{ mt: 2, bgcolor: '#2a2200', color: '#F5C518', border: '1px solid #3a3100' }}>
                {t.service_closed}
              </Alert>
            )}

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

            {results?.map((r, i) => <ResultCard key={i} result={r} index={i} t={t} shadedStops={shadedStops} />)}
          </Box>
        )}

        {/* Where am I? */}
        {tab === 1 && (
          <Box>
            <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: 'primary.main', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.65rem', display: 'block', mb: 1 }}>
              {t.tab_map}
            </Typography>
            <StopMap
              pins={pins}
              onSelect={name => { setBrowseStop(name); setBrowseInput(name) }}
            />
            {pins.length === 0 && (
              <Typography variant='caption' color='text.secondary'
                sx={{ display: 'block', mt: 1.5, mb: 2, textAlign: 'center', lineHeight: 1.6 }}>
                {t.map_no_pins}
              </Typography>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, mb: 2 }}>
              <a href={JPD_MAP_URL} target='_blank' rel='noreferrer' style={{ color: '#F5C518', textDecoration: 'none', fontSize: '0.8rem' }}>
                {t.view_map}
              </a>
            </Box>

            {favourites.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                  {t.favourites}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {favourites.map(stop => (
                    <Chip key={stop} size='small' label={stop}
                      icon={<FavoriteIcon sx={{ fontSize: '12px !important', color: '#ff4a6a !important' }} />}
                      onClick={() => { setBrowseStop(stop); setBrowseInput(stop) }}
                      sx={{ bgcolor: '#1A1A1A', color: 'text.secondary', border: '1px solid #333', fontSize: '0.7rem', cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: 'primary.main', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.65rem' }}>
              {t.stop_label}
            </Typography>
            <Autocomplete options={allStops} value={browseStop} inputValue={browseInput}
              onChange={(_, v) => setBrowseStop(v)}
              onInputChange={guardInput(setBrowseInput)}
              filterOptions={stopFilterOptions}
              renderInput={p => <TextField {...p} placeholder={t.select_stop_browse} size='small' sx={{ mt: 0.75, mb: 1 }} />} />

            {browseStop && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 0 }}>
                <IconButton size='small' onClick={() => toggleFavourite(browseStop)}
                  sx={{ color: favourites.includes(browseStop) ? '#ff4a6a' : 'text.secondary', p: 0.5 }}>
                  {favourites.includes(browseStop) ? <FavoriteIcon fontSize='small' /> : <FavoriteBorderIcon fontSize='small' />}
                </IconButton>
                <Typography variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
                  {t.favourites}
                </Typography>
              </Box>
            )}

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

            {browseStop && shadedStops.has(browseStop) && (
              <Typography variant='caption' sx={{ display: 'block', mt: 2, color: '#6EDC8C' }}>
                🌂 This stop has shade
              </Typography>
            )}

            <Divider sx={{ borderColor: '#222', mt: 4, mb: 2 }} />

            <Typography variant='caption' color='text.secondary'
              onClick={() => { setAdoptStopName(browseStop ?? ''); setTab(2) }}
              sx={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
              Don&apos;t see your stop, or have info to add? → Adopt-a-stop
            </Typography>
          </Box>
        )}

        {/* Adopt-a-stop */}
        {tab === 2 && (
          <Box>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2, lineHeight: 1.6 }}>
              Found a stop pole with a code on it (e.g. <strong style={{ color: '#E8E8E8' }}>BE31 - 050</strong>)?
              Report everything you can see — name, code, shade, photo, and your location — even if the stop isn&apos;t in the app yet.
            </Typography>

            <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: 'primary.main', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.65rem' }}>
              Stop name
            </Typography>
            <Autocomplete freeSolo options={allStops} value={adoptStopName} inputValue={adoptStopName}
              onChange={(_, v) => setAdoptStopName(v ?? '')}
              onInputChange={guardInput(setAdoptStopName)}
              filterOptions={stopFilterOptions}
              renderInput={p => <TextField {...p} placeholder='e.g. Jalan Rakyat Jati Rimba' size='small' sx={{ mt: 0.75, mb: 1.5 }} />} />

            <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: 'primary.main', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.65rem' }}>
              Stop code
            </Typography>
            <TextField fullWidth size='small' placeholder='e.g. BE31 - 050'
              value={adoptStopCode} onChange={e => setAdoptStopCode(e.target.value)}
              sx={{ mt: 0.75, mb: 1.5 }} />

            <Typography variant='caption' sx={{ fontFamily: 'var(--font-mono)', color: 'primary.main', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.65rem' }}>
              Nickname (optional)
            </Typography>
            <TextField fullWidth size='small' placeholder='e.g. Outside the mosque'
              value={adoptNickname} onChange={e => setAdoptNickname(e.target.value)}
              sx={{ mt: 0.75, mb: 2 }} />

            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
              Does this stop have shade?
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button size='small' variant={adoptShade === true ? 'contained' : 'outlined'} onClick={() => setAdoptShade(true)}
                sx={adoptShade === true
                  ? { bgcolor: 'primary.main', color: '#0D0D0D', fontWeight: 700, borderRadius: 2, fontSize: '0.75rem' }
                  : { borderColor: '#333', color: 'text.secondary', borderRadius: 2, fontSize: '0.75rem' }}>
                🌂 Yes
              </Button>
              <Button size='small' variant={adoptShade === false ? 'contained' : 'outlined'} onClick={() => setAdoptShade(false)}
                sx={adoptShade === false
                  ? { bgcolor: 'primary.main', color: '#0D0D0D', fontWeight: 700, borderRadius: 2, fontSize: '0.75rem' }
                  : { borderColor: '#333', color: 'text.secondary', borderRadius: 2, fontSize: '0.75rem' }}>
                ☀️ No
              </Button>
            </Box>

            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
              Location
            </Typography>
            <Button variant='outlined' size='small' startIcon={<MyLocationIcon />}
              onClick={handleAdoptGetLocation}
              disabled={adoptLocState === 'getting'}
              sx={{ mb: 1.5, borderColor: '#333', color: 'text.secondary', borderRadius: 2, fontSize: '0.75rem' }}>
              {adoptLocState === 'getting' ? 'Getting your location...' : adoptCoords ? 'Re-centre on my location' : 'Use my location'}
            </Button>
            {adoptLocState === 'error' && (
              <Alert severity='error' sx={{ mb: 1.5, bgcolor: '#2a0a0a', color: '#ff8a80', border: '1px solid #4a1a1a' }}>
                Could not get location. Please ensure location access is enabled.
              </Alert>
            )}
            <LocationPicker
              position={adoptCoords ? [adoptCoords.lat, adoptCoords.lng] : null}
              defaultCenter={[4.92, 114.95]}
              flyToKey={adoptLocateTrigger}
              onChange={([lat, lng]) => setAdoptCoords(prev => ({ lat, lng, accuracy: prev?.accuracy ?? 0 }))}
            />
            {adoptCoords && (
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1, mb: 2 }}>
                📍 {adoptCoords.lat.toFixed(5)}°N, {adoptCoords.lng.toFixed(5)}°E
                {adoptCoords.accuracy > 0 ? ` (±${Math.round(adoptCoords.accuracy)}m)` : ''}
              </Typography>
            )}
            {!adoptCoords && (
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1, mb: 2 }}>
                No location set yet — tap the map above to drop a pin, or use the button.
              </Typography>
            )}

            {adoptDuplicate && (
              <Alert severity='info' sx={{ mb: 2, bgcolor: '#1a1a00', color: '#F5C518', border: '1px solid #3a3100' }}>
                A stop named &quot;{adoptDuplicate.stop_name}&quot;
                {adoptDuplicate.stop_code ? ` (code: ${adoptDuplicate.stop_code})` : ''} may already be adopted nearby.
                You can still submit if this is a different pole.
              </Alert>
            )}

            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
              Photo (optional)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Button variant='outlined' size='small' component='label'
                sx={{ borderColor: '#333', color: 'text.secondary', borderRadius: 2, fontSize: '0.75rem' }}>
                Choose photo
                <input type='file' accept='image/*' capture='environment' hidden
                  onChange={e => handleAdoptPhotoChange(e.target.files?.[0] ?? null)} />
              </Button>
              {adoptPhotoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={adoptPhotoPreview} alt='' style={{ height: 48, width: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid #333' }} />
              )}
            </Box>

            <Button fullWidth variant='contained' onClick={handleAdoptSubmit}
              disabled={!adoptStopName.trim() || !adoptStopCode.trim() || !adoptCoords || adoptState === 'submitting'}
              sx={{ bgcolor: 'primary.main', color: '#0D0D0D', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: 1, borderRadius: 2, py: 1.25, '&:hover': { bgcolor: '#e5b800' } }}>
              Report this stop
            </Button>

            {adoptState === 'submitting' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <CircularProgress size={14} sx={{ color: 'primary.main' }} />
                <Typography variant='caption' color='text.secondary'>Submitting...</Typography>
              </Box>
            )}
            {adoptState === 'success' && (
              <Alert severity='success' sx={{ mt: 2, bgcolor: '#0a2a0a', color: '#6EDC8C', border: '1px solid #1a4a1a' }}>
                Thanks for adopting this stop!
              </Alert>
            )}
            {adoptState === 'error' && (
              <Alert severity='error' sx={{ mt: 2, bgcolor: '#2a0a0a', color: '#ff8a80', border: '1px solid #4a1a1a' }}>
                Submission failed. Please try again.
              </Alert>
            )}
          </Box>
        )}

        {/* What's New */}
        {tab === 3 && (
          <Box>
            {CHANGELOG.map((entry, i) => (
              <Card key={entry.version} sx={{ mb: 2, bgcolor: '#1A1A1A' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                    <Typography variant='body2' sx={{ fontFamily: 'var(--font-mono)', color: 'primary.main', fontWeight: 700 }}>
                      {entry.version}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>{entry.date}</Typography>
                    {i === 0 && (
                      <Chip label='Latest' size='small' sx={{ bgcolor: 'primary.main', color: '#0D0D0D', fontWeight: 700, fontSize: '0.65rem', height: 18 }} />
                    )}
                  </Box>
                  {entry.notes.map((note, j) => (
                    <Typography key={j} variant='body2' color='text.secondary' sx={{ display: 'flex', gap: 1, mb: 0.5, lineHeight: 1.5 }}>
                      <span>·</span><span>{note}</span>
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Community */}
        {tab === 4 && (
          <Box>
            {communityPosts.length === 0 && (
              <Typography variant='caption' color='text.secondary'
                sx={{ display: 'block', mt: 2, textAlign: 'center', lineHeight: 1.6 }}>
                {t.community_empty}
              </Typography>
            )}
            {communityPosts.map(post => (
              <Card key={post.id} sx={{ mb: 2, bgcolor: '#1A1A1A' }}>
                {post.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.image_url} alt='' style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
                )}
                <CardContent>
                  {post.caption && (
                    <Typography variant='body2' sx={{ mb: 1, lineHeight: 1.5 }}>{post.caption}</Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {post.credit_name && (
                      <Typography variant='caption' color='text.secondary'>{post.credit_name}</Typography>
                    )}
                    <a href={post.post_url} target='_blank' rel='noreferrer' style={{ color: '#F5C518', textDecoration: 'none', fontSize: '0.75rem' }}>
                      {t.community_view_post}
                    </a>
                  </Box>
                </CardContent>
              </Card>
            ))}
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
            bus.brubah.com · v0.4
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
