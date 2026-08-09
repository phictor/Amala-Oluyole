type CustomMealConfig = {
  swallow?: { id: string; name: string };
  soup?: { id: string; name: string };
  proteins?: { id: string; name: string; quantity: number }[];
  extras?: { id: string; name: string; quantity: number }[];
} | null;

type OperationalItemSource = {
  name: string;
  quantity: number;
  isCustomMeal: boolean;
  customMealConfig: CustomMealConfig;
  specialInstructions: string | null;
};

type OperationalOrderSource = {
  id: number;
  orderNumber: string;
  branchId: number;
  orderType: string;
  status: string;
  createdAt: Date;
  items: readonly OperationalItemSource[];
};

export function projectOperationalItems(items: readonly OperationalItemSource[]) {
  return items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    isCustomMeal: item.isCustomMeal,
    customMealConfig: item.customMealConfig,
    specialInstructions: item.specialInstructions,
  }));
}

export function projectOperationalOrder(order: OperationalOrderSource) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    branchId: order.branchId,
    orderType: order.orderType,
    status: order.status,
    createdAt: order.createdAt,
    items: projectOperationalItems(order.items),
  };
}

export function projectOperationalOrderDetail(detail: {
  order: Omit<OperationalOrderSource, "items">;
  items: readonly OperationalItemSource[];
}) {
  const projected = projectOperationalOrder({ ...detail.order, items: detail.items });
  const { items, ...order } = projected;
  return { order, items };
}

export function projectRiderOrder(order: {
  id: number;
  orderNumber: string;
  branchId: number;
  orderType: string;
  status: string;
  deliveryAddress: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  deliveryInstructions: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    branchId: order.branchId,
    orderType: order.orderType,
    status: order.status,
    deliveryAddress: order.deliveryAddress,
    deliveryLatitude: order.deliveryLatitude,
    deliveryLongitude: order.deliveryLongitude,
    deliveryInstructions: order.deliveryInstructions,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
