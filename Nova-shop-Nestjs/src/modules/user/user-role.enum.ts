import { registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  Customer = 'customer',
  Admin = 'admin',
  Staff = 'staff',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role in the system',
});
