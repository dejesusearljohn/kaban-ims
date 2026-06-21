import { useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const REALTIME_TABLES = [
  'inventory',
  'inventory_photos',
  'borrowed_items',
  'wmr_reports',
  'vehicles',
  'vehicle_repairs',
  'par_records',
  'users',
  'departments',
  'distribution_logs',
  'accountability_reports',
  'shift_turnovers',
  'daily_checks',
  'daily_check_items',
  'stockpile',
] as const

/**
 * Subscribes to Postgres changes on all app tables and invokes onChange when any row changes.
 */
export function useSupabaseRealtime(onChange: () => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    let channel = supabase.channel(`realtime-app-${crypto.randomUUID()}`)

    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          onChangeRef.current()
        },
      )
    }

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('Supabase realtime subscription failed. Live updates may require a page refresh.')
      }
    })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])
}
