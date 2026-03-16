import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify Supabase JWT
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' })

  // Check if already paid
  const { data: save } = await supabase
    .from('city_saves')
    .select('is_paid')
    .eq('user_id', user.id)
    .single()

  if (save?.is_paid) {
    return res.status(400).json({ error: 'Already purchased' })
  }

  const appUrl = process.env.VITE_APP_URL || `https://${req.headers.host}`

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: {
          name: 'Romulus',
          description: 'One-time purchase — build your Roman city forever.',
        },
        unit_amount: 300, // £3.00
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${appUrl}/?payment=success`,
    cancel_url: `${appUrl}/?payment=cancelled`,
    metadata: { user_id: user.id },
    customer_email: user.email,
  })

  res.status(200).json({ url: session.url })
}
