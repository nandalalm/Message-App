import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();
import { IUserService } from "../interfaces/services/IAuthService";
import { IUserRepository } from "../interfaces/Repositories/IUserRepository";
import { UserDTO } from "../dtos/userDtos";
import { IUser } from "../models/userModel";
import { HttpStatus } from "../constants/httpStatus";
import { generateOTP, sendOTPEmail } from "../utils/generateOtp";
import { setOTP, getOTP, deleteOTP } from "../config/redisClient";
import { createAccessToken, createRefreshToken } from "../utils/jwt";
import { Messages } from "../constants/messages";
import { IImageService } from "../interfaces/services/IImageService";
import { generateResetToken, sendPasswordResetEmail } from "../utils/passwordReset";

import { AppError } from "../utils/AppError";

export class UserService implements IUserService {
  private _userRepository: IUserRepository;
  private _imageService: IImageService;

  constructor(userRepository: IUserRepository, imageService: IImageService) {
    this._userRepository = userRepository;
    this._imageService = imageService;
  }

  async register(userData: Omit<UserDTO, 'id'>, password: string): Promise<void> {
    const existing = await this._userRepository.findByEmail(userData.email);
    if (existing) throw new AppError(Messages.USER_EXISTS, HttpStatus.CONFLICT);

    const existingUsername = await this._userRepository.findByUsername(userData.username);
    if (existingUsername) throw new AppError("Username already taken", HttpStatus.CONFLICT);

    const hashedPassword = await bcrypt.hash(password, 10);
    const tempUserData = {
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
    };

    await setOTP(`tempUser:${userData.email}`, JSON.stringify(tempUserData), 900);

    const otp = generateOTP();
    await setOTP(`otp:${userData.email}`, otp, 60);
    await sendOTPEmail(userData.email, otp);
  }

  async verifyOTP(email: string, otp: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; username: string; email: string; profileImageUrl?: string | undefined };
  }> {
    const storedOtp = await getOTP(`otp:${email}`);
    if (!storedOtp) throw new AppError("OTP has expired. Please request a new one.", HttpStatus.GONE);
    if (storedOtp !== otp) throw new AppError("Invalid OTP. Please check and try again.", HttpStatus.BAD_REQUEST);

    const tempUserDataStr = await getOTP(`tempUser:${email}`);
    if (!tempUserDataStr) throw new AppError(Messages.REGISTRATION_SESSION_EXPIRED, HttpStatus.GONE);

    const tempUserData = JSON.parse(tempUserDataStr);

    const existing = await this._userRepository.findByEmail(email);
    if (existing) throw new Error(Messages.USER_EXISTS);

    await this._userRepository.createUser(tempUserData as IUser);

    await deleteOTP(`otp:${email}`);

    const user = await this._userRepository.findByEmail(email);
    if (!user) {
      throw new Error("User creation failed");
    }

    let profileImageUrl = user.profileImageUrl;
    if (user.profileImageKey) {
      try {
        profileImageUrl = await this._imageService.generateSignedUrl(user.profileImageKey);
      } catch (error) {
        console.error("Failed to generate profile image URL:", error);
      }
    }

    const accessToken = createAccessToken(user.id, user.email, user.username);
    const refreshToken = createRefreshToken(user.id, user.email, user.username);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profileImageUrl: profileImageUrl,
      },
    };
  }

  async resendOTP(email: string): Promise<void> {
    const tempUserDataStr = await getOTP(`tempUser:${email}`);
    if (!tempUserDataStr) throw new Error(Messages.REGISTRATION_SESSION_EXPIRED);

    const otp = generateOTP();
    await setOTP(`otp:${email}`, otp, 60);
    await sendOTPEmail(email, otp);
  }

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this._userRepository.findByEmail(email);
    if (!user) throw new AppError("Email not found. Please register first.", HttpStatus.UNAUTHORIZED);

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new AppError("Incorrect password. Please try again.", HttpStatus.UNAUTHORIZED);

    const accessToken = createAccessToken(user.id, user.email, user.username);
    const refreshToken = createRefreshToken(user.id, user.email, user.username);

    return { accessToken, refreshToken };
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return await this._userRepository.findByEmail(email);
  }

  async checkUsername(username: string): Promise<boolean> {
    const user = await this._userRepository.findByUsername(username);
    return !!user;
  }

  async getProfile(userId: string): Promise<UserDTO> {
    const user = await this._userRepository.findById(userId);
    if (!user) throw new Error(Messages.USER_NOT_FOUND);

    let profileImageUrl = user.profileImageUrl;
    if (user.profileImageKey) {
      try {
        profileImageUrl = await this._imageService.generateSignedUrl(user.profileImageKey);
      } catch (error) {
        console.error("Failed to generate profile image URL:", error);
      }
    }

    const dto: UserDTO = {
      id: user.id,
      username: user.username,
      email: user.email,
      profileImageUrl: profileImageUrl,
    };
    return dto;
  }

  private async uploadToS3(file: Buffer, fileName: string, contentType: string): Promise<{ url: string; key: string }> {
    const result = await this._imageService.createImagesFromFiles("system", [{ file, fileName, contentType }]);
    if (result.length === 0) throw new Error("Upload failed");
    return { url: result[0].imageUrl, key: result[0].s3Key };
  }

  private async deleteFromS3(key: string): Promise<void> {
    try {
      await this._imageService.deleteByKey(key);
    } catch (error) {
      console.error(`Failed to delete profile image ${key}:`, error);
    }
  }

  async updateProfileImage(userId: string, file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<UserDTO> {
    const user = await this._userRepository.findById(userId);
    if (!user) throw new Error(Messages.USER_NOT_FOUND);

    if (user.profileImageKey) {
      await this.deleteFromS3(user.profileImageKey);
    }

    const { url, key } = await this.uploadToS3(file.buffer, file.originalname, file.mimetype);
    const updated = await this._userRepository.updateProfileImage(userId, url, key);
    if (!updated) throw new Error(Messages.USER_NOT_FOUND);

    let profileImageUrl = updated.profileImageUrl;
    if (updated.profileImageKey) {
      try {
        profileImageUrl = await this._imageService.generateSignedUrl(updated.profileImageKey);
      } catch (error) {
        console.error("Failed to generate profile image URL:", error);
      }
    }

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      profileImageUrl: profileImageUrl,
    };
  }

  async deleteProfileImage(userId: string): Promise<UserDTO> {
    const user = await this._userRepository.findById(userId);
    if (!user) throw new Error(Messages.USER_NOT_FOUND);

    if (user.profileImageKey) {
      await this.deleteFromS3(user.profileImageKey);
    }

    const updated = await this._userRepository.clearProfileImage(userId);
    if (!updated) throw new Error(Messages.USER_NOT_FOUND);
    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      profileImageUrl: updated.profileImageUrl,
    };
  }

  async requestPasswordReset(email: string, originBaseUrl?: string): Promise<{ emailExists: boolean }> {
    const user = await this._userRepository.findByEmail(email);
    if (!user) {
      return { emailExists: false };
    }
    const token = generateResetToken();
    const ttlSeconds = 15 * 60;
    await setOTP(`reset:${token}`, email, ttlSeconds);
    const base = originBaseUrl || process.env.FRONTEND_BASE_URL;
    const link = `${base}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, link);
    return { emailExists: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const email = await getOTP(`reset:${token}`);
    if (!email) {
      throw new Error(Messages.INVALID_RESET_TOKEN);
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await this._userRepository.updatePasswordByEmail(email, hash);
    await deleteOTP(`reset:${token}`);
  }
}
