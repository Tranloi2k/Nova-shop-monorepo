import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService, OrderEmailPayload } from './mail.service';

describe('MailService', () => {
  const config = { get: jest.fn() };
  const order: OrderEmailPayload = {
    reference: 'ORD-1',
    subtotal: 100,
    shippingFee: 0,
    taxAmount: 0,
    total: 100,
    items: [{ name: 'Nova Phone', quantity: 1, price: 100 }],
  };

  beforeEach(() => jest.clearAllMocks());

  it('skips delivery and logs a warning when the recipient is empty', async () => {
    const warning = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const service = new MailService(config as unknown as ConfigService);

    await service.sendOrderConfirmation('', order);

    expect(warning).toHaveBeenCalledWith(
      'Skipping email "Order ORD-1 confirmed" - no recipient address',
    );
  });
});
