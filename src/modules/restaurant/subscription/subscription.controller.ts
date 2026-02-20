import { Request, Response } from "express";
import {
  createRestaurantSubscription,
  updateRestaurantSubscription,
  cancelRestaurantSubscription,
  listRestaurantSubscriptions,
  attachPaymentMethodToSubscription,
} from "./subscription.service";

// Subscribe
export const subscribeRestaurant = async (req: Request, res: Response) => {
  const { restaurantId, planId } = req.body;
  
  if (!restaurantId || !planId) {
    return res.status(400).json({ 
      success: false,
      error: "restaurantId and planId are required" 
    });
  }
  
  try {
    const result = await createRestaurantSubscription(restaurantId, planId);
    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: {
        subscription: result.dbSub,
        clientSecret: result.clientSecret, // Frontend needs this to complete payment
        stripeSubscription: result.stripeSubscription,
      },
    });
  } catch (err: any) {
    console.error("[Subscription Controller] Error:", err);
    const statusCode = err.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ 
      success: false,
      error: err.message || "Failed to create subscription" 
    });
  }
};

// Update subscription plan
export const updateSubscription = async (req: Request, res: Response) => {
  const { subscriptionId, newPlanId } = req.body;
  
  if (!subscriptionId || !newPlanId) {
    return res.status(400).json({ 
      success: false,
      error: "subscriptionId and newPlanId are required" 
    });
  }
  
  try {
    const result = await updateRestaurantSubscription(subscriptionId, newPlanId);
    res.json({
      success: true,
      message: "Subscription updated successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("[Subscription Controller] Error:", err);
    const statusCode = err.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ 
      success: false,
      error: err.message || "Failed to update subscription" 
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req: Request, res: Response) => {
  const { subscriptionId } = req.body;
  
  if (!subscriptionId) {
    return res.status(400).json({ 
      success: false,
      error: "subscriptionId is required" 
    });
  }
  
  try {
    const result = await cancelRestaurantSubscription(subscriptionId);
    res.json({
      success: true,
      message: "Subscription cancelled successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("[Subscription Controller] Error:", err);
    const statusCode = err.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ 
      success: false,
      error: err.message || "Failed to cancel subscription" 
    });
  }
};

// List subscriptions for a restaurant
export const getRestaurantSubscriptions = async (req: Request, res: Response) => {
  const { restaurantId } = req.params;
  
  if (!restaurantId) {
    return res.status(400).json({ error: "Restaurant ID is required" });
  }
  
  try {
    const subscriptions = await listRestaurantSubscriptions(restaurantId);
    res.json({
      success: true,
      message: "Subscriptions retrieved successfully",
      data: subscriptions,
    });
  } catch (err: any) {
    console.error("[Subscription Controller] Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Failed to retrieve subscriptions" 
    });
  }
};

// Attach payment method to subscription
export const attachPaymentMethod = async (req: Request, res: Response) => {
  const { restaurantId, paymentMethodId } = req.body;
  
  if (!restaurantId || !paymentMethodId) {
    return res.status(400).json({ 
      success: false,
      error: "restaurantId and paymentMethodId are required" 
    });
  }
  
  try {
    const result = await attachPaymentMethodToSubscription(restaurantId, paymentMethodId);
    res.json({
      success: true,
      message: "Payment method attached successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("[Subscription Controller] Error:", err);
    const statusCode = err.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ 
      success: false,
      error: err.message || "Failed to attach payment method" 
    });
  }
};
