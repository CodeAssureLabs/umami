import { hashPassword } from '@/lib/password';

export const USER_UPDATE_FIELDS = ['username', 'password', 'role'] as const;

export interface UserUpdateInput {
  username?: string;
  password?: string;
  role?: string;
}

export function buildUserUpdate(body: UserUpdateInput, { isAdmin }: { isAdmin: boolean }) {
  const data: Record<string, any> = {};

  for (const field of USER_UPDATE_FIELDS) {
    const value = body[field];

    if (value === undefined) {
      continue;
    }

    if (field === 'password') {
      data.password = hashPassword(value);
    } else if (field === 'username') {
      if (isAdmin) {
        data.username = value.toLowerCase();
      }
    } else {
      data[field] = value;
    }
  }

  return data;
}
