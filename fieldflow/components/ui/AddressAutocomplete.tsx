'use client'

import { useEffect, useRef, useState } from 'react'

interface AddressParts {
  address: string
  city: string
  state: string
  zip: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (parts: AddressParts) => void
  placeholder?: string
  className?: string
  label?: string
}

declare global {
  interface Window {
    google?: any
    _gmapsLoaded?: boolean
    _gmapsCallbacks?: Array<() => void>
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window._gmapsLoaded) return Promise.resolve()
  return new Promise((resolve) => {
    if (window._gmapsCallbacks) {
      window._gmapsCallbacks.push(resolve)
      return
    }
    window._gmapsCallbacks = [resolve]
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = () => {
      window._gmapsLoaded = true
      ;(window._gmapsCallbacks ?? []).forEach((cb) => cb())
      window._gmapsCallbacks = []
    }
    document.head.appendChild(script)
  })
}

function parsePlace(place: any): AddressParts {
  const comps = place.address_components ?? []
  const get = (type: string) =>
    comps.find((c: any) => c.types.includes(type))?.short_name ?? ''

  const streetNumber = get('street_number')
  const route = comps.find((c: any) => c.types.includes('route'))?.long_name ?? ''
  const address = [streetNumber, route].filter(Boolean).join(' ')
  const city =
    comps.find((c: any) => c.types.includes('locality'))?.long_name ??
    comps.find((c: any) => c.types.includes('sublocality'))?.long_name ?? ''
  const state = get('administrative_area_level_1')
  const zip = get('postal_code')

  return { address, city, state, zip }
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = '123 Main St',
  className = 'input',
  label,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    if (!apiKey || !inputRef.current) return

    loadGoogleMaps(apiKey).then(() => setReady(true))
  }, [apiKey])

  useEffect(() => {
    if (!ready || !inputRef.current || !window.google) return
    if (autocompleteRef.current) return // already initialized

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address'],
    })

    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place?.address_components) return
      const parts = parsePlace(place)
      onChange(parts.address || place.formatted_address || '')
      onSelect?.(parts)
    })

    autocompleteRef.current = ac
  }, [ready, onChange, onSelect])

  return (
    <>
      {label && <label className="label">{label}</label>}
      <input
        ref={inputRef}
        type="text"
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={apiKey ? 'off' : 'street-address'}
      />
    </>
  )
}
