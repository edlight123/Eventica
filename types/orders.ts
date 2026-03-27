/**
 * Order Management Types
 * 
 * Handles customer checkout sessions, order items, and payment tracking
 */

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded'

export interface OrderItem {
  ticketTypeId: string           // References ticket_tiers.id
  ticketTypeName: string          // Display name
  quantity: number
  unitPrice: number              // Price per ticket in cents
  totalPrice: number             // unitPrice * quantity
}

export interface Order {
  id: string
  userId: string | null          // null for guest checkout
  eventId: string
  
  // Items
  items: OrderItem[]
  
  // Pricing (all in cents)
  subtotal: number               // Sum of all item totals
  platformFee: number            // Eventica's fee
  processingFee: number          // Stripe processing fee (estimated)
  total: number                  // Final amount charged
  currency: 'HTG' | 'USD' | 'CAD'
  
  // Payment tracking
  status: OrderStatus
  stripePaymentIntentId?: string | null
  stripePaymentStatus?: string | null
  
  // Buyer information
  buyerName?: string | null
  buyerEmail?: string | null
  buyerPhone?: string | null
  
  // Timestamps
  createdAt: string              // ISO string
  updatedAt: string              // ISO string
  completedAt?: string | null    // When payment succeeded
}

/**
 * Firestore collection structure:
 * /orders/{orderId}
 * 
 * Indexes needed:
 * - userId + createdAt (desc)
 * - eventId + status + createdAt (desc)
 * - stripePaymentIntentId (asc) - for webhook lookups
 * - status + createdAt (desc)
 */

/**
 * Helper types for API requests/responses
 */

export interface CreateOrderRequest {
  eventId: string
  items: {
    ticketTypeId: string
    quantity: number
  }[]
  buyerInfo?: {
    name?: string
    email?: string
    phone?: string
  }
}

export interface CreateOrderResponse {
  orderId: string
  order: Order
  clientSecret?: string          // Stripe Payment Intent client secret
}

export interface OrderSummary {
  order: Order
  event: {
    id: string
    title: string
    startDateTime: string
    venueName: string
    city: string
  }
  ticketTypes: {
    id: string
    name: string
    price: number
  }[]
}
