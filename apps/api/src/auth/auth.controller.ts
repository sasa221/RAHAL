import { Body, Controller, Delete, Get, Param, Post, Req, Res } from "@nestjs/common";
import type {
  AccountSecurityOverview,
  ApiSuccess,
  AuthLoginResult,
  AuthSession,
  ContactChangeRequestResult,
  ContactChangeResult,
  PasswordChangeResult,
  PasswordResetRequestResult,
  PasswordResetResult,
  SessionRevocationResult,
  StaffMfaChallenge,
  StaffMfaCompletion,
} from "@rahal/contracts";
import { createHmac } from "node:crypto";
import type { Request, Response } from "express";
import { loadApiConfig } from "../config";
import {
  authCookieName,
  readAuthCookie,
  readStaffMfaChallengeCookie,
  staffMfaChallengeCookieName,
} from "./auth-cookie";
import { AuthRateLimitService } from "./auth-rate-limit.service";
import {
  ChangePasswordDto,
  ConfirmContactChangeDto,
  ConfirmStaffMfaDto,
  ConfirmPasswordResetDto,
  ConfirmVerificationDto,
  LoginDto,
  RegisterDto,
  RequestContactChangeDto,
  RequestPasswordResetDto,
  RequestVerificationDto,
} from "./auth.dto";
import { AuthService, type AuthRequestContext } from "./auth.service";

const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const staffMfaChallengeLifetimeMs = 5 * 60 * 1000;

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
    await this.rateLimits.assertAllowed(
      `register:${context.ipHash ?? "unknown"}`,
      3,
      60 * 60 * 1000,
    );
    const result = await this.auth.register(input, context);
    this.setSessionCookie(response, result.token);
    return { data: result.session };
  }

  @Post("login")
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccess<AuthLoginResult>> {
    const context = this.context(request);
    await this.rateLimits.assertAllowed(`login:${context.ipHash ?? "unknown"}`, 5, 15 * 60 * 1000);
    const result = await this.auth.login(input, context);
    if ("challengeToken" in result) {
      response.clearCookie(authCookieName, this.cookieOptions());
      this.setStaffMfaChallengeCookie(response, result.challengeToken);
      return { data: result.result };
    }
    this.setSessionCookie(response, result.token);
    response.clearCookie(staffMfaChallengeCookieName, this.staffMfaCookieOptions());
    return { data: result.session };
  }

  @Get("session")
  async session(@Req() request: Request): Promise<ApiSuccess<AuthSession>> {
    return { data: await this.auth.getSessionStatus(readAuthCookie(request)) };
  }

  @Get("staff-mfa/challenge")
  async staffMfaChallenge(@Req() request: Request): Promise<ApiSuccess<StaffMfaChallenge>> {
    return {
      data: await this.auth.getStaffMfaChallenge(readStaffMfaChallengeCookie(request)),
    };
  }

  @Post("staff-mfa/confirm")
  async confirmStaffMfa(
    @Body() input: ConfirmStaffMfaDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccess<StaffMfaCompletion>> {
    const context = this.context(request);
    await this.rateLimits.assertAllowed(
      `staff-mfa:${context.ipHash ?? "unknown"}`,
      8,
      10 * 60 * 1000,
    );
    const result = await this.auth.completeStaffMfaChallenge(
      readStaffMfaChallengeCookie(request),
      input,
      context,
    );
    response.clearCookie(staffMfaChallengeCookieName, this.staffMfaCookieOptions());
    this.setSessionCookie(response, result.token);
    return { data: result.completion };
  }

  @Delete("session")
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccess<{ loggedOut: true }>> {
    await this.auth.logout(readAuthCookie(request), this.context(request));
    response.clearCookie(authCookieName, this.cookieOptions());
    response.clearCookie(staffMfaChallengeCookieName, this.staffMfaCookieOptions());
    return { data: { loggedOut: true } };
  }

  @Get("security")
  async security(@Req() request: Request): Promise<ApiSuccess<AccountSecurityOverview>> {
    return { data: await this.auth.securityOverview(readAuthCookie(request)) };
  }

  @Post("password/change")
  async changePassword(
    @Body() input: ChangePasswordDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<PasswordChangeResult>> {
    const context = this.context(request);
    await this.rateLimits.assertAllowed(
      `password-change:${context.ipHash ?? "unknown"}`,
      5,
      15 * 60 * 1000,
    );
    return {
      data: await this.auth.changePassword(readAuthCookie(request), input, context),
    };
  }

  @Post("password-reset/request")
  async requestPasswordReset(
    @Body() input: RequestPasswordResetDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<PasswordResetRequestResult>> {
    const context = this.context(request);
    await this.rateLimits.assertAllowed(
      `password-reset-request:${context.ipHash ?? "unknown"}`,
      3,
      15 * 60 * 1000,
    );
    return { data: await this.auth.requestPasswordReset(input, context) };
  }

  @Post("password-reset/confirm")
  async confirmPasswordReset(
    @Body() input: ConfirmPasswordResetDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccess<PasswordResetResult>> {
    const context = this.context(request);
    await this.rateLimits.assertAllowed(
      `password-reset-confirm:${context.ipHash ?? "unknown"}`,
      8,
      15 * 60 * 1000,
    );
    const result = await this.auth.confirmPasswordReset(input, context);
    response.clearCookie(authCookieName, this.cookieOptions());
    return { data: result };
  }

  @Delete("security/sessions/others")
  async revokeOtherSessions(@Req() request: Request): Promise<ApiSuccess<SessionRevocationResult>> {
    return {
      data: await this.auth.revokeOtherSessions(readAuthCookie(request), this.context(request)),
    };
  }

  @Delete("security/sessions/:id")
  async revokeSession(
    @Param("id") id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccess<SessionRevocationResult>> {
    const result = await this.auth.revokeOwnedSession(
      readAuthCookie(request),
      id,
      this.context(request),
    );
    if (result.currentSessionRevoked) {
      response.clearCookie(authCookieName, this.cookieOptions());
    }
    return { data: result };
  }

  @Post("verification/request")
  async requestVerification(@Body() input: RequestVerificationDto, @Req() request: Request) {
    const context = this.context(request);
    await this.rateLimits.assertAllowed(
      `verification-request:${context.ipHash ?? "unknown"}:${input.channel}`,
      3,
      15 * 60 * 1000,
    );
    return {
      data: await this.auth.requestVerification(readAuthCookie(request), input, context),
    };
  }

  @Post("verification/confirm")
  async confirmVerification(@Body() input: ConfirmVerificationDto, @Req() request: Request) {
    const context = this.context(request);
    await this.rateLimits.assertAllowed(
      `verification-confirm:${context.ipHash ?? "unknown"}:${input.channel}`,
      8,
      15 * 60 * 1000,
    );
    return {
      data: await this.auth.confirmVerification(readAuthCookie(request), input, context),
    };
  }

  @Post("contact-change/request")
  async requestContactChange(
    @Body() input: RequestContactChangeDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<ContactChangeRequestResult>> {
    const context = this.context(request);
    await this.rateLimits.assertAllowed(
      `contact-change-request:${context.ipHash ?? "unknown"}:${input.channel}`,
      3,
      15 * 60 * 1000,
    );
    return {
      data: await this.auth.requestContactChange(readAuthCookie(request), input, context),
    };
  }

  @Post("contact-change/confirm")
  async confirmContactChange(
    @Body() input: ConfirmContactChangeDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<ContactChangeResult>> {
    const context = this.context(request);
    await this.rateLimits.assertAllowed(
      `contact-change-confirm:${context.ipHash ?? "unknown"}:${input.channel}`,
      8,
      15 * 60 * 1000,
    );
    return {
      data: await this.auth.confirmContactChange(readAuthCookie(request), input, context),
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
    response.cookie(authCookieName, token, { ...this.cookieOptions(), maxAge: sessionLifetimeMs });
  }

  private staffMfaCookieOptions() {
    return { ...this.cookieOptions(), path: "/api/auth" };
  }

  private setStaffMfaChallengeCookie(response: Response, token: string) {
    response.cookie(staffMfaChallengeCookieName, token, {
      ...this.staffMfaCookieOptions(),
      maxAge: staffMfaChallengeLifetimeMs,
    });
  }
}
