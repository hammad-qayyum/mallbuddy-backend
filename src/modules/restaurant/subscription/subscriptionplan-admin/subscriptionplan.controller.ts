import { Request, Response } from "express";
import * as service from "./subscriptionplan.service";
import {
  createSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
} from "./subscriptionplan.schema";

export async function createPlan(req: Request, res: Response) {
  try {
    const parseResult = createSubscriptionPlanSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        errors: parseResult.error.flatten(),
      });
    }

    const plan = await service.createPlan(parseResult.data);
    res.status(201).json({
      success: true,
      message: "Subscription plan created successfully",
      data: plan,
    });
  } catch (err: any) {
    console.error("[Subscription Plan Controller] Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to create subscription plan",
    });
  }
}

export async function getPlans(req: Request, res: Response) {
  try {
    const plans = await service.getPlans();
    res.json({
      success: true,
      message: "Subscription plans retrieved successfully",
      data: plans,
    });
  } catch (err: any) {
    console.error("[Subscription Plan Controller] Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to retrieve subscription plans",
    });
  }
}

export async function getPlanById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Plan ID is required",
      });
    }

    const plan = await service.getPlanById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: "Subscription plan not found",
      });
    }

    res.json({
      success: true,
      message: "Subscription plan retrieved successfully",
      data: plan,
    });
  } catch (err: any) {
    console.error("[Subscription Plan Controller] Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to retrieve subscription plan",
    });
  }
}

export async function updatePlan(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Plan ID is required",
      });
    }

    const parseResult = updateSubscriptionPlanSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        errors: parseResult.error.flatten(),
      });
    }

    const plan = await service.updatePlan(id, parseResult.data);
    res.json({
      success: true,
      message: "Subscription plan updated successfully",
      data: plan,
    });
  } catch (err: any) {
    console.error("[Subscription Plan Controller] Error:", err);
    const statusCode = err.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: err.message || "Failed to update subscription plan",
    });
  }
}

export async function deactivatePlan(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Plan ID is required",
      });
    }

    const plan = await service.deactivatePlan(id);
    res.json({
      success: true,
      message: "Subscription plan deactivated successfully",
      data: plan,
    });
  } catch (err: any) {
    console.error("[Subscription Plan Controller] Error:", err);
    const statusCode = err.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: err.message || "Failed to deactivate subscription plan",
    });
  }
}
