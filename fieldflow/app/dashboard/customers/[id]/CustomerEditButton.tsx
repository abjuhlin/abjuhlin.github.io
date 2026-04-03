'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CustomerModal } from '@/components/customers/CustomerModal'

interface Props {
  customerId: string
  companyId: string
}

export function CustomerEditButton({ customerId, companyId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary text-sm"
      >
        Edit Customer
      </button>
      {open && (
        <CustomerModal
          companyId={companyId}
          customerId={customerId}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
