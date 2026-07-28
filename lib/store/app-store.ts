import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Branch, CartItem, Meal, CustomMeal, Address, Order, User, Notification } from '../data/types';

// ============================================================
// State Shape
// ============================================================
interface AppState {
  // Auth
  user: User | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  // Branch
  selectedBranch: Branch | null;
  // Cart
  cartItems: CartItem[];
  promoCode: string;
  promoDiscount: number;
  // Orders
  orders: Order[];
  // Notifications
  notifications: Notification[];
  unreadNotificationCount: number;
  // Favourites
  favouriteMealIds: string[];
  // UI
  hasSeenOnboarding: boolean;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_GUEST'; payload: boolean }
  | { type: 'SET_BRANCH'; payload: Branch }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_PROMO'; payload: { code: string; discount: number } }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER_STATUS'; payload: { id: string; status: Order['status'] } }
  | { type: 'TOGGLE_FAVOURITE'; payload: string }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'SET_ONBOARDING_SEEN' }
  | { type: 'HYDRATE'; payload: Partial<AppState> }
  | { type: 'LOGOUT' };

const initialState: AppState = {
  user: null,
  isGuest: false,
  isAuthenticated: false,
  selectedBranch: null,
  cartItems: [],
  promoCode: '',
  promoDiscount: 0,
  orders: [],
  notifications: [],
  unreadNotificationCount: 0,
  favouriteMealIds: [],
  hasSeenOnboarding: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: action.payload !== null };
    case 'SET_GUEST':
      return { ...state, isGuest: action.payload, isAuthenticated: action.payload };
    case 'SET_BRANCH':
      return { ...state, selectedBranch: action.payload };
    case 'ADD_TO_CART': {
      const existing = state.cartItems.find(i => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          cartItems: state.cartItems.map(i =>
            i.id === action.payload.id
              ? { ...i, quantity: i.quantity + action.payload.quantity, totalPrice: i.unitPrice * (i.quantity + action.payload.quantity) }
              : i
          ),
        };
      }
      return { ...state, cartItems: [...state.cartItems, action.payload] };
    }
    case 'REMOVE_FROM_CART':
      return { ...state, cartItems: state.cartItems.filter(i => i.id !== action.payload) };
    case 'UPDATE_CART_QUANTITY':
      return {
        ...state,
        cartItems: state.cartItems.map(i =>
          i.id === action.payload.id
            ? { ...i, quantity: action.payload.quantity, totalPrice: i.unitPrice * action.payload.quantity }
            : i
        ).filter(i => i.quantity > 0),
      };
    case 'CLEAR_CART':
      return { ...state, cartItems: [], promoCode: '', promoDiscount: 0 };
    case 'SET_PROMO':
      return { ...state, promoCode: action.payload.code, promoDiscount: action.payload.discount };
    case 'ADD_ORDER':
      return { ...state, orders: [action.payload, ...state.orders] };
    case 'UPDATE_ORDER_STATUS':
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.payload.id ? { ...o, status: action.payload.status } : o
        ),
      };
    case 'TOGGLE_FAVOURITE': {
      const isFav = state.favouriteMealIds.includes(action.payload);
      return {
        ...state,
        favouriteMealIds: isFav
          ? state.favouriteMealIds.filter(id => id !== action.payload)
          : [...state.favouriteMealIds, action.payload],
      };
    }
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, isRead: true } : n
        ),
        unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1),
      };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadNotificationCount: 0,
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadNotificationCount: state.unreadNotificationCount + 1,
      };
    case 'SET_ONBOARDING_SEEN':
      return { ...state, hasSeenOnboarding: true };
    case 'LOGOUT':
      return { ...initialState, hasSeenOnboarding: state.hasSeenOnboarding };
    case 'HYDRATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = '@amala_oluyole_state';
const PERSIST_KEYS: (keyof AppState)[] = [
  'user', 'isGuest', 'isAuthenticated', 'selectedBranch',
  'cartItems', 'orders', 'notifications', 'unreadNotificationCount',
  'favouriteMealIds', 'hasSeenOnboarding',
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          dispatch({ type: 'HYDRATE', payload: saved });
        } catch {}
      }
    });
  }, []);

  // Persist state on change
  useEffect(() => {
    const toPersist = PERSIST_KEYS.reduce((acc, key) => {
      (acc as Record<string, unknown>)[key] = state[key];
      return acc;
    }, {} as Partial<AppState>);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
  }, [state]);

  return React.createElement(
    AppContext.Provider,
    { value: { state, dispatch } },
    children
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}

// Convenience selectors
export function useCart() {
  const { state, dispatch } = useAppStore();
  const subtotal = state.cartItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const deliveryFee = state.selectedBranch ? 800 : 0;
  const serviceFee = Math.round(subtotal * 0.05);
  const discount = state.promoDiscount;
  const total = subtotal + deliveryFee + serviceFee - discount;
  return {
    items: state.cartItems,
    itemCount: state.cartItems.reduce((sum, i) => sum + i.quantity, 0),
    subtotal,
    deliveryFee,
    serviceFee,
    discount,
    total,
    promoCode: state.promoCode,
    dispatch,
  };
}
