'use client'

import { useState } from 'react'
import { CustomerModal } from './CustomerModal'

export function AddCustomerButton({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Customer
      </button>
      {open && (
        <CustomerModal
          companyId={companyId}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false)
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
