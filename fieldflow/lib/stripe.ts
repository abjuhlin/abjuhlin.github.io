import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

export async function createPaymentIntent(
  amount: number,
  currency = 'usd',
  metadata: Record<string, string> = {}
) {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // convert to cents
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  })
}

export async function createPaymentLink(
  amount: number,
  description: string,
  metadata: Record<string, string> = {}
) {
  const product = await stripe.products.create({ name: description })
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(amount * 100),
    currency: 'usd',
  })
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata,
  })
  return paymentLink
}
