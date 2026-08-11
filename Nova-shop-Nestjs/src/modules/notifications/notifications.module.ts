import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Global so any module (orders, admin, auth) can inject MailService without
 * re-importing this module.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class NotificationsModule {}
