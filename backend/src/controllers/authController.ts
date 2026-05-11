import { Request, Response, NextFunction } from "express";
import jwt, { VerifyErrors, JwtPayload } from "jsonwebtoken";
import { inject, injectable } from "inversify";
import { TYPES } from "../config/types";
import { IUserService } from "../interfaces/services/IAuthService";
import { IImageService } from "../interfaces/services/IImageService";
import { HttpStatus } from "../constants/httpStatus";
import { Messages } from "../constants/messages";
import { AppError } from "../utils/AppError";

@injectable()
export class AuthController {
  private _userService: IUserService;
  private _imageService: IImageService;

  constructor(
    @inject(TYPES.UserService) userService: IUserService,
    @inject(TYPES.ImageService) imageService: IImageService
  ) {
    this._userService = userService;
    this._imageService = imageService;
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, email, password } = req.body;
      const result = await this._userService.register({ username, email }, password);
      res.status(HttpStatus.CREATED).json(result);
    } catch (err) {
      next(err);
    }
  };

  checkUsername = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username } = req.body;
      if (!username) return next(new AppError(Messages.USERNAME_REQUIRED, HttpStatus.BAD_REQUEST));
      const exists = await this._userService.checkUsername(username);
      if (exists) {
        return next(new AppError(Messages.USERNAME_TAKEN, HttpStatus.CONFLICT));
      }
      res.status(HttpStatus.OK).json({ exists });
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as { email?: string };
      if (!email) return next(new AppError(Messages.EMAIL_REQUIRED, HttpStatus.BAD_REQUEST));
      const origin = req.headers.origin || process.env.FRONTEND_BASE_URL;

      const result = await this._userService.requestPasswordReset(email, typeof origin === "string" ? origin : undefined);
      if (!result.emailExists) {
        return next(new AppError(Messages.EMAIL_NOT_REGISTERED, HttpStatus.BAD_REQUEST));
      }

      return res.status(HttpStatus.OK).json({ message: Messages.RESET_LINK_SENT });
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body as { token?: string; password?: string };
      if (!token || !password) return next(new AppError(Messages.TOKEN_AND_PASSWORD_REQUIRED, HttpStatus.BAD_REQUEST));
      if (password.length < 6) return next(new AppError(Messages.PASSWORD_TOO_SHORT, HttpStatus.BAD_REQUEST));
      await this._userService.resetPassword(token, password);
      return res.status(HttpStatus.OK).json({ message: Messages.PASSWORD_UPDATED });
    } catch (err) {
      next(err);
    }
  };

  verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, otp } = req.body;

      const { accessToken, refreshToken, user } = await this._userService.verifyOTP(email, otp);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(HttpStatus.OK).json({
        accessToken,
        user
      });
    } catch (err) {
      next(err);
    }
  };

  resendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      if (!email) return next(new AppError(Messages.EMAIL_REQUIRED, HttpStatus.BAD_REQUEST));

      await this._userService.resendOTP(email);
      res.status(HttpStatus.OK).json({ message: Messages.OTP_SEND_SUCCESS });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken } = await this._userService.login(email, password);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(HttpStatus.OK).json({ accessToken });
    } catch (err) {
      next(err);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.refreshToken;
      if (!token) return next(new AppError(Messages.NO_REFRESH_TOKEN, HttpStatus.UNAUTHORIZED));

      interface CustomJwtPayload extends JwtPayload {
        id: string;
        email: string;
        username: string;
      }

      const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
      if (!refreshSecret) {
        return next(new AppError(Messages.SERVER_CONFIG_ERROR, HttpStatus.INTERNAL_SERVER_ERROR));
      }

      jwt.verify(token, refreshSecret, (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
        if (err) return next(new AppError(Messages.INVALID_REFRESH_TOKEN, HttpStatus.FORBIDDEN));

        const payload = decoded as CustomJwtPayload;
        const accessSecret = process.env.ACCESS_TOKEN_SECRET;
        if (!accessSecret) {
          return next(new AppError(Messages.SERVER_CONFIG_ERROR, HttpStatus.INTERNAL_SERVER_ERROR));
        }

        const accessToken = jwt.sign({ id: payload.id, email: payload.email, username: payload.username }, accessSecret, {
          expiresIn: "15m",
        });

        return res.status(HttpStatus.OK).json({ accessToken });
      });
    } catch (err) {
      next(err);
    }
  };

  getHome = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      res.status(HttpStatus.OK).json({
        message: Messages.WELCOME_HOME,
        user: {
          id: user?.id,
          username: user?.username,
          email: user?.email
        }
      });
    } catch (err) {
      next(err);
    }
  };

  logout = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      res.status(HttpStatus.OK).json({ message: Messages.LOGGED_OUT });
    } catch (err) {
      next(err);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(Messages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED));
      }
      const profile = await this._userService.getProfile(userId);

      if (profile.profileImageUrl) {
        const authHeader = req.headers.authorization;
        const accessToken = authHeader?.split(" ")[1];
        if (accessToken) {
          profile.profileImageUrl = `/api/user/profile-image?token=${accessToken}&v=${Date.now()}`;
        }
      }

      return res.status(HttpStatus.OK).json({ user: profile });
    } catch (err) {
      next(err);
    }
  };

  serveProfileImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let userId: string | undefined;
      const { token } = req.query;

      const authHeader = req.headers.authorization;
      const authToken = authHeader?.split(" ")[1];

      if (authToken) {
        try {
          const accessSecret = process.env.ACCESS_TOKEN_SECRET;
          if (!accessSecret) throw new Error(Messages.MISSING_ACCESS_TOKEN_SECRET);
          const decoded = jwt.verify(authToken, accessSecret) as JwtPayload & { id: string };
          userId = decoded.id;
        } catch {
          userId = undefined;
        }
      }

      if (!userId && token) {
        try {
          const accessSecret = process.env.ACCESS_TOKEN_SECRET;
          if (!accessSecret) throw new Error(Messages.MISSING_ACCESS_TOKEN_SECRET);
          const decoded = jwt.verify(token as string, accessSecret) as JwtPayload & { id: string };
          userId = decoded.id;
        } catch {
          return next(new AppError(Messages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED));
        }
      }

      if (!userId) {
        return next(new AppError(Messages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED));
      }

      const s3Key = await this._userService.getProfileImageKey(userId);
      if (!s3Key) {
        return next(new AppError(Messages.PROFILE_IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND));
      }

      const signedUrl = await this._imageService.generateSignedUrl(s3Key, 300);

      const fetch = (await import("node-fetch")).default;
      const imageResponse = await fetch(signedUrl);

      if (!imageResponse.ok) {
        return next(new AppError(Messages.PROFILE_IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND));
      }

      res.set({
        "Content-Type": imageResponse.headers.get("content-type") || "image/jpeg",
        "Content-Length": imageResponse.headers.get("content-length") || "",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });

      imageResponse.body?.pipe(res);
    } catch (err) {
      next(err);
    }
  };

  updateProfilePhoto = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(Messages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED));
      }
      const file = req.file;
      if (!file) {
        return next(new AppError(Messages.NO_IMAGE_PROVIDED, HttpStatus.BAD_REQUEST));
      }
      const updated = await this._userService.updateProfileImage(userId, {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      });

      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(" ")[1];
      if (updated.profileImageUrl && accessToken) {
        updated.profileImageUrl = `/api/user/profile-image?token=${accessToken}&v=${Date.now()}`;
      }

      return res.status(HttpStatus.OK).json({ user: updated, message: Messages.PROFILE_IMAGE_UPDATED });
    } catch (err) {
      next(err);
    }
  };

  deleteProfilePhoto = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(Messages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED));
      }
      const updated = await this._userService.deleteProfileImage(userId);

      return res.status(HttpStatus.OK).json({ user: updated, message: Messages.PROFILE_IMAGE_REMOVED });
    } catch (err) {
      next(err);
    }
  };
}
