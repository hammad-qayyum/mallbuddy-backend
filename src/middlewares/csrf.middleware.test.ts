import { describe, it, expect, vi } from "vitest";
import { csrfHeaderGuard } from "./csrf.middleware";
import type { Request, Response, NextFunction } from "express";

/**
 * SMOKE BUG-05 — the guard must reject cookie-only writes without
 * X-Requested-With, but pass requests that authenticate via explicit
 * headers (Bearer / better-auth.session_token), which are not CSRF-able.
 */
function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: "POST",
    path: "/orders/cancel",
    originalUrl: "/api/orders/cancel",
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as Response & { statusCode: number; body: any };
}

describe("csrfHeaderGuard", () => {
  it("rejects a cookie-only POST without X-Requested-With", () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    csrfHeaderGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it("passes a POST that sends X-Requested-With", () => {
    const req = makeReq({ headers: { "x-requested-with": "fetch" } } as any);
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    csrfHeaderGuard(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("passes a Bearer-authenticated POST without X-Requested-With", () => {
    const req = makeReq({
      headers: { authorization: "Bearer some-session-token" },
    } as any);
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    csrfHeaderGuard(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("passes a custom-header-authenticated POST without X-Requested-With", () => {
    const req = makeReq({
      headers: { "better-auth.session_token": "some-session-token" },
    } as any);
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    csrfHeaderGuard(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("does not treat a non-Bearer Authorization scheme as exempt", () => {
    const req = makeReq({
      headers: { authorization: "Basic dXNlcjpwdw==" },
    } as any);
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    csrfHeaderGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it("always passes safe methods (GET)", () => {
    const req = makeReq({ method: "GET" } as any);
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    csrfHeaderGuard(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
