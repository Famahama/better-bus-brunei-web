export interface RouteEntry {
  trip_id: string
  route: string
  direction: string
  stop_seq: number
  stop_name: string
  stop_id: string
  full_route: string
}

export interface StopEntry {
  stop_seq: number
  stop_name: string
  stop_name_clean: string
  stop_id: string
}

export interface Leg {
  trip_id: string
  route: string
  direction: string
  full_route: string
  board: string
  alight: string
  stops_count: number
  segment: StopEntry[]
}

export interface JourneyResult {
  type: 'direct' | 'transfer'
  legs: Leg[]
}

export interface GraphData {
  stopRoutes: Map<string, RouteEntry[]>
  tripStops: Map<string, StopEntry[]>
  allStops: string[]
}

export type Language = 'English' | 'Melayu' | '中文' | 'বাংলা' | 'हिन्दी' | 'Filipino'

export interface StopPin {
  stop_id: string
  stop_name: string
  lat: number
  lng: number
  stop_code?: string
  nickname?: string
  has_shade?: boolean | null
  photo_url?: string | null
}
