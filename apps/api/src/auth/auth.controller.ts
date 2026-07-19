import { Body, Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import type { ApiSuccess, AuthSession } from "@rahal/contracts";
import { createHmac } from "node:crypto";
import type { Request, Response } from "express";
import { loadApiConfig } from "../config";
import { AuthRateLimitService } from "./auth-rate-limit.service";
import { ConfirmVerificationDto, LoginDto, RegisterDto, RequestVerificationDto } from "./auth.dto";
import { AuthService, type AuthRequestContext } from "./auth.service";

const cookieName = "rahal_session";
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;

function readCookie(request: Request) {
  const cookies = request.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const [name, ...value] = cookie.trim().split("=");
    if (name === cookieName) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

@Controller("auth")
export class AuthController {
  private readonly config = loadApiConfig();

  constructor(
    private readonly auth: AuthService,
    private readonly rateLimits: AuthRateLimitService,
  ) {}

  @Post("register")
  async register(
    @Body() input: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccess<AuthSession>> {
    const context = this.context(request);
    this.rateLimits.assertAllowed(`register:${context.ipHash ?? "unknown"}`, 3, 60 * 60 * 1000);
    const result = await this.auth.register(input, context);
    this.setSessionCookie(response, result.token);
    return { data: result.session };
  }

  @Post("login")
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccess<AuthSession>> {
    const context = this.context(request);
    this.rateLimits.assertAllowed(`login:${context.ipHash ?? "unknown"}`, 5, 15 * 60 * 1000);
    const result = await this.auth.login(input, context);
    this.setSessionCookie(response, result.token);
    return { data: result.session };
  }

  @Get("session")
  async session(@Req() request: Request): Promise<ApiSuccess<AuthSession>> {
    return { data: await this.auth.getSession(readCookie(request)) };
  }

  @Delete("session")
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccess<{ loggedOut: true }>> {
    await this.auth.logout(readCookie(request), this.context(request));
    response.clearCookie(cookieName, this.cookieOptions());
    return { data: { loggedOut: true } };
  }

  @Post("verification/request")
  async requestVerification(@Body() input: RequestVerificationDto, @Req() request: Request) {
    const context = this.context(request);
    this.rateLimits.assertAllowed(
      `verification-request:${context.ipHash ?? "unknown"}:${input.channel}`,
      3,
      15 * 60 * 1000,
    );
    return {
      data: await this.auth.requestVerification(readCookie(request), input, context),
    };
  }

  @Post("verification/confirm")
  async confirmVerification(@Body() input: ConfirmVerificationDto, @Req() request: Request) {
    const context = this.context(request);
    this.rateLimits.assertAllowed(
      `verification-confirm:${context.ipHash ?? "unknown"}:${input.channel}`,
      8,
      15 * 60 * 1000,
    );
    return {
      data: await this.auth.confirmVerification(readCookie(request), input, context),
    };
  }

  private context(request: Request): AuthRequestContext {
    const address = request.ip || request.socket.remoteAddress || "unknown";
    return {
      ipHash: createHmac("sha256", this.config.authSecret).update(address).digest("hex"),
      userAgent: request.headers["user-agent"]?.slice(0, 500),
    };
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: this.config.production,
      path: "/api",
    };
  }

  private setSessionCookie(response: Response, token: string) {
    response.cookie(cookieName, token, { ...this.cookieOptions(), maxAge: sessionLifetimeMs });
  }
}
