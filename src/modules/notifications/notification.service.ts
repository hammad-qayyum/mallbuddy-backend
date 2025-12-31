import prisma from "../../config/prisma";
import { ORDER_STATUS_MESSAGES } from "./notification.constants";

/**
 * Notification Service
 * 
 * Handles push notifications for order-related events using Expo Push Notification service.
 * 
 * Features:
 * - User notifications for order status updates (ACCEPTED, PREPARING, READY, CANCELLED)
 * - Restaurant notifications for new orders and cancellations
 * - Admin notifications (same as restaurant)
 * 
 * @module notifications/notification.service
 */

/**
 * Input type for sending a notification
 */
type SendNotificationInput = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
};

/**
 * Sends a push notification via Expo Push Notification service
 * 
 * @param {SendNotificationInput} input - Notification details
 * @returns {Promise<void>}
 * 
 * @example
 * await sendNotification({
 *   to: "ExponentPushToken[xxxxx]",
 *   title: "Order Accepted",
 *   body: "Your order has been accepted",
 *   data: { orderId: "123" }
 * });
 */
export async function sendNotification({
  to,
  title,
  body,
  data,
}: SendNotificationInput): Promise<void> {
  if (!to) {
    console.warn("[Notification] Skipping notification: no token provided");
    return;
  }

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        sound: "default",
        title,
        body,
        data,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Notification] Failed to send notification to ${to}:`, errorText);
    } else {
      console.log(`[Notification] Successfully sent notification to ${to}`);
    }
  } catch (error: any) {
    console.error(`[Notification] Error sending notification to ${to}:`, error.message);
    // Don't throw - notifications are non-critical
  }
}

/* ================= USER NOTIFICATIONS ================= */

/**
 * Notifies the user about order status updates
 * 
 * Sends notifications for the following statuses:
 * - ACCEPTED: Order has been accepted by restaurant
 * - PREPARING: Food is being prepared
 * - READY: Order is ready for pickup
 * - CANCELLED: Order has been cancelled
 * 
 * @param {any} order - Order object with status and user (with expoPushToken)
 * @returns {Promise<void>}
 * 
 * @example
 * await notifyUserOrderStatus(order);
 */
export async function notifyUserOrderStatus(order: any): Promise<void> {
  if (!order) {
    console.warn("[Notification] notifyUserOrderStatus: Order is null/undefined");
    return;
  }

  const status = order.status as keyof typeof ORDER_STATUS_MESSAGES;
  const message = ORDER_STATUS_MESSAGES[status];
  if (!message) {
    console.log(`[Notification] No notification message for status: ${order.status}`);
    return;
  }

  if (!order.user?.expoPushToken) {
    console.log(`[Notification] User ${order.userId} has no push token registered`);
    return;
  }

  try {
    await sendNotification({
      to: order.user.expoPushToken,
      title: message.title,
      body: message.body,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        screen: "OrderDetailsScreen",
      },
    });
  } catch (error: any) {
    console.error(`[Notification] Error notifying user for order ${order.id}:`, error.message);
  }
}

/* ================= RESTAURANT + ADMIN NOTIFICATIONS ================= */

/**
 * Notifies restaurant and admin users about a new order
 * 
 * Sends notifications to:
 * - Restaurant owner (the user associated with the restaurant)
 * - All admin users with registered push tokens
 * 
 * @param {any} order - Order object with restaurant (with user) relation
 * @returns {Promise<void>}
 * 
 * @example
 * await notifyRestaurantAndAdminNewOrder(order);
 */
export async function notifyRestaurantAndAdminNewOrder(order: any): Promise<void> {
  if (!order) {
    console.warn("[Notification] notifyRestaurantAndAdminNewOrder: Order is null/undefined");
    return;
  }

  if (!order.restaurant?.user) {
    console.warn(`[Notification] Order ${order.id} has no restaurant user associated`);
    return;
  }

  try {
    // Fetch all admin users with push tokens
    const admins = await prisma.user.findMany({
      where: { 
        role: "ADMIN", 
        expoPushToken: { not: null } 
      },
      select: {
        id: true,
        expoPushToken: true,
      },
    });

    const recipients = [
      order.restaurant.user,
      ...admins,
    ];

    const orderNumber = order.orderNumber || order.id;
    const orderTotal = order.total ? `$${Number(order.total).toFixed(2)}` : "";

    for (const user of recipients) {
      if (!user?.expoPushToken) {
        continue;
      }

      await sendNotification({
        to: user.expoPushToken,
        title: "New Order Received 🧾",
        body: `Order ${orderNumber}${orderTotal ? ` - ${orderTotal}` : ""} has been placed`,
        data: { 
          orderId: order.id,
          orderNumber: orderNumber,
          screen: "OrderDetailsScreen",
        },
      });
    }

    console.log(`[Notification] Sent new order notifications to ${recipients.length} recipients`);
  } catch (error: any) {
    console.error(`[Notification] Error notifying restaurant/admin for order ${order.id}:`, error.message);
  }
}

/**
 * Notifies restaurant and admin users about an order cancellation
 * 
 * Sends notifications to:
 * - Restaurant owner (the user associated with the restaurant)
 * - All admin users with registered push tokens
 * 
 * @param {any} order - Order object with restaurant (with user) relation
 * @returns {Promise<void>}
 * 
 * @example
 * await notifyRestaurantAndAdminCancelled(order);
 */
export async function notifyRestaurantAndAdminCancelled(order: any): Promise<void> {
  if (!order) {
    console.warn("[Notification] notifyRestaurantAndAdminCancelled: Order is null/undefined");
    return;
  }

  if (!order.restaurant?.user) {
    console.warn(`[Notification] Order ${order.id} has no restaurant user associated`);
    return;
  }

  try {
    // Fetch all admin users with push tokens
    const admins = await prisma.user.findMany({
      where: { 
        role: "ADMIN", 
        expoPushToken: { not: null } 
      },
      select: {
        id: true,
        expoPushToken: true,
      },
    });

    const recipients = [
      order.restaurant.user,
      ...admins,
    ];

    const orderNumber = order.orderNumber || order.id;

    for (const user of recipients) {
      if (!user?.expoPushToken) {
        continue;
      }

      await sendNotification({
        to: user.expoPushToken,
        title: "Order Cancelled ❌",
        body: `Order ${orderNumber} has been cancelled`,
        data: { 
          orderId: order.id,
          orderNumber: orderNumber,
          status: "CANCELLED",
          screen: "OrderDetailsScreen",
        },
      });
    }

    console.log(`[Notification] Sent cancellation notifications to ${recipients.length} recipients`);
  } catch (error: any) {
    console.error(`[Notification] Error notifying restaurant/admin about cancellation for order ${order.id}:`, error.message);
  }
}
