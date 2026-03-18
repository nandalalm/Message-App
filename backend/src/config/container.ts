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
import { TYPES } from "./types";

export const container = new Container();

container.bind<IUserRepository>(TYPES.UserRepository).toConstantValue(new UserRepository());

container.bind<IUserService>(TYPES.UserService).toDynamicValue(() => {
  const userRepo = container.get<IUserRepository>(TYPES.UserRepository);
  const imageService = container.get<IImageService>(TYPES.ImageService);
  return new UserService(userRepo, imageService);
});

container.bind<IImageRepository>(TYPES.ImageRepository).toConstantValue(new ImageRepository());

container.bind<IImageService>(TYPES.ImageService).toDynamicValue(() => {
  const imageRepo = container.get<IImageRepository>(TYPES.ImageRepository);
  return new ImageService(imageRepo);
});

container.bind<IMessageRepository>(TYPES.MessageRepository).toConstantValue(new MessageRepository());

container.bind<IMessageService>(TYPES.MessageService).toDynamicValue(() => {
  const messageRepo = container.get<IMessageRepository>(TYPES.MessageRepository);
  const imageService = container.get<IImageService>(TYPES.ImageService);
  return new MessageService(messageRepo, imageService);
});

container.bind<IPollRepository>(TYPES.PollRepository).toConstantValue(new PollRepository());

container.bind<IPollService>(TYPES.PollService).toDynamicValue(() => {
  const pollRepo = container.get<IPollRepository>(TYPES.PollRepository);
  return new PollService(pollRepo);
});

container.bind<IMessageNotificationRepository>(TYPES.MessageNotificationRepository).toConstantValue(new MessageNotificationRepository());
container.bind<IPollNotificationRepository>(TYPES.PollNotificationRepository).toConstantValue(new PollNotificationRepository());

container.bind<INotificationService>(TYPES.NotificationService).toDynamicValue(() => {
  const messageNotifRepo = container.get<IMessageNotificationRepository>(TYPES.MessageNotificationRepository);
  const pollNotifRepo = container.get<IPollNotificationRepository>(TYPES.PollNotificationRepository);
  const userRepo = container.get<IUserRepository>(TYPES.UserRepository);
  return new NotificationService(messageNotifRepo, pollNotifRepo, userRepo);
});
