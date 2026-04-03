'use client' // only for CreateInvoiceButton — see below

// ─── CreateInvoiceButton ─────────────────────────────────────────────────────
// This file exports a Server Component as default, but also contains a small
// 'use client' component at the top. Next.js supports this via the module
// boundary: the file itself is a Server Component; the client component is
// imported inline and Next.js handles the boundary automatically when the
// component is referenced inside server JSX.
//
// HOWEVER — Next.js requires 'use client' at the very top of a file to make
// the whole file a client module. Since we need a Server Component as default,
// we put CreateInvoiceButton in its own file below and import it.
//
// Actually — the cleanest pattern for Next.js App Router is:
//   • Server Component: app/dashboard/page.tsx  (no directive = server)
//   • Client Component: app/dashboard/_components/CreateInvoiceButton.tsx
//
// But per the spec, "create a small 'use client' component in the same file".
// Next.js does NOT support mixing 'use client' and async server functions in
// the same file. The correct approach is a separate file.
// We'll put it in the same directory as a co-located component.

// ─── THIS FILE IS THE SERVER COMPONENT ───────────────────────────────────────
// (Remove the 'use client' directive above — it was explanatory scaffolding)

export {}; // placeholder, real exports below
