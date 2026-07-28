// ============================================================
// Core Types for Amala Oluyole App
// ============================================================

export type OrderStatus =
  | 'created'
  | 'awaiting_payment'
  | 'payment_confirmed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'rider_assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'refunded';

export type OrderType = 'delivery' | 'pickup' | 'dine_in';
export type PaymentMethod = 'card' | 'transfer' | 'ussd' | 'wallet' | 'cash' | 'corporate';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  latitude: number;
  longitude: number;
  openingTime: string;
  closingTime: string;
  isOpen: boolean;
  supportsDelivery: boolean;
  supportsPickup: boolean;
  supportsDineIn: boolean;
  supportsReservations: boolean;
  distanceKm?: number;
}

export interface MealCategory {
  id: string;
  name: string;
  icon: string;
  description?: string;
  mealCount: number;
}

export interface Meal {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  categoryName: string;
  preparationTime: number; // minutes
  isAvailable: boolean;
  isVegetarian?: boolean;
  allergens?: string[];
  portionSizes?: PortionSize[];
  labels?: ('popular' | 'new' | 'chefs_choice' | 'best_seller')[];
  rating?: number;
  reviewCount?: number;
}

export interface PortionSize {
  id: string;
  name: string;
  price: number;
}

export interface SwallowOption {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface SoupOption {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface ProteinOption {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  isPremium?: boolean;
}

export interface ExtraOption {
  id: string;
  name: string;
  price: number;
  category: 'soup' | 'stew' | 'protein' | 'swallow' | 'side' | 'drink' | 'other';
}

export interface CustomMeal {
  swallow: SwallowOption;
  soup: SoupOption;
  protein: ProteinOption[];
  extras: ExtraOption[];
  specialInstructions?: string;
  totalPrice: number;
}

export interface CartItem {
  id: string;
  meal?: Meal;
  customMeal?: CustomMeal;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  landmark?: string;
  instructions?: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  branchId: string;
  branchName: string;
  items: CartItem[];
  orderType: OrderType;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddress?: Address;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  tax: number;
  total: number;
  promoCode?: string;
  loyaltyPointsUsed?: number;
  estimatedTime?: number;
  riderName?: string;
  riderPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  code?: string;
  discountType: 'percentage' | 'fixed' | 'free_delivery' | 'bogo';
  discountValue: number;
  minimumOrder?: number;
  expiresAt: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface LoyaltyAccount {
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointsToNextTier: number;
  totalEarned: number;
  totalRedeemed: number;
  history: LoyaltyTransaction[];
}

export interface LoyaltyTransaction {
  id: string;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus';
  points: number;
  description: string;
  date: string;
}

export interface Reservation {
  id: string;
  branchId: string;
  branchName: string;
  date: string;
  time: string;
  guests: number;
  seatingPreference: 'indoor' | 'outdoor' | 'private';
  specialRequests?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  confirmationCode?: string;
}

export interface CateringRequest {
  id?: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  guestCount: number;
  preferredMeals: string;
  serviceRequirements: string;
  budgetRange: string;
  contactName: string;
  contactPhone: string;
  additionalInstructions?: string;
  status?: 'submitted' | 'reviewing' | 'quoted' | 'confirmed';
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  avatarUrl?: string;
  addresses: Address[];
  loyaltyAccount: LoyaltyAccount;
  isGuest: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'promotion' | 'loyalty' | 'reservation' | 'system';
  isRead: boolean;
  createdAt: string;
  orderId?: string;
}

