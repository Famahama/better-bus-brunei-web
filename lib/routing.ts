import type { GraphData, JourneyResult, StopEntry } from './types'

function makeSegment(stops: StopEntry[], fromIdx: number, toIdx: number): [StopEntry[], number] {
  const lo = Math.min(fromIdx, toIdx)
  const hi = Math.max(fromIdx, toIdx)
  let seg = stops.slice(lo, hi + 1)
  if (fromIdx > toIdx) seg = [...seg].reverse()
  return [seg, hi - lo]
}

export function findRoute(
  originClean: string,
  destClean: string,
  { stopRoutes, tripStops }: GraphData
): JourneyResult[] {
  if (!stopRoutes.has(originClean) || !stopRoutes.has(destClean)) return []

  const originEntries = stopRoutes.get(originClean)!
  const destEntries   = stopRoutes.get(destClean)!

  const originTripMap = new Map(originEntries.map(e => [e.trip_id, e]))
  const destTripMap   = new Map(destEntries.map(e => [e.trip_id, e]))

  const results: JourneyResult[] = []

  // Direct routes
  for (const [tripId, o] of originTripMap) {
    if (!destTripMap.has(tripId)) continue
    const stops = tripStops.get(tripId)!
    const oIdx  = stops.findIndex(s => s.stop_name_clean === originClean)
    const dIdx  = stops.findIndex(s => s.stop_name_clean === destClean)
    if (oIdx === -1 || dIdx === -1 || oIdx === dIdx) continue
    const [segment, count] = makeSegment(stops, oIdx, dIdx)
    results.push({
      type: 'direct',
      legs: [{
        trip_id:    tripId,
        route:      o.route,
        direction:  o.direction,
        full_route: o.full_route,
        board:      stops[oIdx].stop_name,
        alight:     stops[dIdx].stop_name,
        stops_count: count,
        segment,
      }],
    })
  }

  if (results.length > 0) {
    results.sort((a, b) =>
      a.legs.reduce((s, l) => s + l.stops_count, 0) -
      b.legs.reduce((s, l) => s + l.stops_count, 0)
    )
    return results.slice(0, 3)
  }

  // Transfer routes (1 change)
  const originAllStops = new Set<string>()
  for (const [tripId] of originTripMap) {
    for (const s of tripStops.get(tripId) ?? []) originAllStops.add(s.stop_name_clean)
  }

  const destAllStops = new Set<string>()
  for (const [tripId] of destTripMap) {
    for (const s of tripStops.get(tripId) ?? []) destAllStops.add(s.stop_name_clean)
  }

  const BSB_TERMINAL = 'bsb bus terminal'
  const transferStops = [...originAllStops]
    .filter(s => destAllStops.has(s))
    .sort((a, b) => {
      if (a === BSB_TERMINAL) return 1
      if (b === BSB_TERMINAL) return -1
      return 0
    })

  for (const transferClean of transferStops) {
    if (transferClean === originClean || transferClean === destClean) continue

    for (const [tripId1, o] of originTripMap) {
      const stops1 = tripStops.get(tripId1)!
      const oIdx   = stops1.findIndex(s => s.stop_name_clean === originClean)
      const tIdx   = stops1.findIndex(s => s.stop_name_clean === transferClean)
      if (oIdx === -1 || tIdx === -1 || oIdx === tIdx) continue

      for (const [tripId2, d] of destTripMap) {
        if (tripId2 === tripId1) continue
        const stops2 = tripStops.get(tripId2)!
        const t2Idx  = stops2.findIndex(s => s.stop_name_clean === transferClean)
        const dIdx   = stops2.findIndex(s => s.stop_name_clean === destClean)
        if (t2Idx === -1 || dIdx === -1 || t2Idx === dIdx) continue

        const [seg1, count1] = makeSegment(stops1, oIdx, tIdx)
        const [seg2, count2] = makeSegment(stops2, t2Idx, dIdx)

        results.push({
          type: 'transfer',
          legs: [
            {
              trip_id: tripId1, route: o.route, direction: o.direction,
              full_route: o.full_route,
              board:  stops1[oIdx].stop_name,
              alight: stops1[tIdx].stop_name,
              stops_count: count1, segment: seg1,
            },
            {
              trip_id: tripId2, route: d.route, direction: d.direction,
              full_route: d.full_route,
              board:  stops2[t2Idx].stop_name,
              alight: stops2[dIdx].stop_name,
              stops_count: count2, segment: seg2,
            },
          ],
        })

        if (results.length >= 3) return results.slice(0, 3)
      }
    }
  }

  return results.slice(0, 3)
}
