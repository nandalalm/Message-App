import { Container } from "inversify";
import { IUserRepository } from "../interfaces/Repositories/IUserRepository";
import { IUserService } from "../interfaces/services/IAuthService";
import { IImageRepository } from "../interfaces/Repositories/IImageRepository";
import { IImageService } from "../interfaces/services/IImageService";
import { UserRepository } from "../repositories/UserRepository";
import { UserService } from "../services/AuthService";
import { ImageRepository } from "../repositories/ImageRepository";
import { ImageService } from "../services/ImageService";
import { IMessageRepository } from "../interfaces/Repositories/IMessageRepository";
import { IMessageService } from "../interfaces/services/IMessageService";
import { MessageRepository } from "../repositories/messageRepository";
import { MessageService } from "../services/messageService";
import { IPollRepository } from "../interfaces/Repositories/IPollRepository";
import { IPollService } from "../interfaces/services/IPollService";
import { PollRepository } from "../repositories/pollRepository";
import { PollService } from "../services/pollService";
import { IMessageNotificationRepository } from "../interfaces/Repositories/IMessageNotificationRepository";
import { IPollNotificationRepository } from "../interfaces/Repositories/IPollNotificationRepository";
import { INotificationService } from "../interfaces/services/INotificationService";
import { MessageNotificationRepository, PollNotificationRepository } from "../repositories/NotificationRepository";
import { NotificationService } from "../services/NotificationService";
import { AuthController } from "../controllers/authController";
import { ImageController } from "../controllers/imageController";
import { NotificationController } from "../controllers/NotificationController";
import { TYPES } from "./types";

export const container = new Container();

container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository).inSingletonScope();

container.bind<IUserService>(TYPES.UserService).to(UserService);

container.bind<IImageRepository>(TYPES.ImageRepository).to(ImageRepository).inSingletonScope();

container.bind<IImageService>(TYPES.ImageService).to(ImageService);

container.bind<IMessageRepository>(TYPES.MessageRepository).to(MessageRepository).inSingletonScope();

container.bind<IMessageService>(TYPES.MessageService).to(MessageService);

container.bind<IPollRepository>(TYPES.PollRepository).to(PollRepository).inSingletonScope();

container.bind<IPollService>(TYPES.PollService).to(PollService);

container.bind<IMessageNotificationRepository>(TYPES.MessageNotificationRepository).to(MessageNotificationRepository).inSingletonScope();

container.bind<IPollNotificationRepository>(TYPES.PollNotificationRepository).to(PollNotificationRepository).inSingletonScope();

container.bind<INotificationService>(TYPES.NotificationService).to(NotificationService);

container.bind<AuthController>(TYPES.AuthController).to(AuthController).inSingletonScope();

container.bind<ImageController>(TYPES.ImageController).to(ImageController).inSingletonScope();

container.bind<NotificationController>(TYPES.NotificationController).to(NotificationController).inSingletonScope();
