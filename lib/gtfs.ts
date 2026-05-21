import type { GraphData, RouteEntry, StopEntry } from './types'

import stopsJson    from './data/stops.json'
import routesJson   from './data/routes.json'
import tripsJson    from './data/trips.json'
import stopTimesJson from './data/stop_times.json'

let cached: GraphData | null = null

export function buildGraph(): GraphData {
  if (cached) return cached

  const stopMap  = new Map(stopsJson.map(s  => [s.stop_id,  s]))
  const routeMap = new Map(routesJson.map(r  => [r.route_id, r]))
  const tripMap  = new Map(tripsJson.map(t  => [t.trip_id,  t]))

  const stopRoutes = new Map<string, RouteEntry[]>()
  const tripStops  = new Map<string, StopEntry[]>()

  for (const st of stopTimesJson) {
    const stop  = stopMap.get(st.stop_id)
    const trip  = tripMap.get(st.trip_id)
    if (!stop || !trip) continue
    const route = routeMap.get(trip.route_id)
    if (!route) continue

    const clean = stop.stop_name.trim().toLowerCase()

    if (!stopRoutes.has(clean)) stopRoutes.set(clean, [])
    stopRoutes.get(clean)!.push({
      trip_id:    st.trip_id,
      route:      route.route_short_name,
      direction:  trip.trip_headsign,
      stop_seq:   parseInt(st.stop_sequence),
      stop_name:  stop.stop_name,
      stop_id:    st.stop_id,
      full_route: route.route_long_name,
    })

    if (!tripStops.has(st.trip_id)) tripStops.set(st.trip_id, [])
    tripStops.get(st.trip_id)!.push({
      stop_seq:        parseInt(st.stop_sequence),
      stop_name:       stop.stop_name,
      stop_name_clean: clean,
      stop_id:         st.stop_id,
    })
  }

  for (const stops of tripStops.values()) {
    stops.sort((a, b) => a.stop_seq - b.stop_seq)
  }

  const seen = new Set<string>()
  const allStops: string[] = []
  for (const s of stopsJson) {
    if (!seen.has(s.stop_name)) {
      seen.add(s.stop_name)
      allStops.push(s.stop_name)
    }
  }
  allStops.sort()

  cached = { stopRoutes, tripStops, allStops }
  return cached
}
