
import 'next';
import { NextRequest } from 'next/server';

declare module 'next' {
  interface NextApiRequest {
    user: {
      id: string;
      role: string;
    };
  }
}

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    role: string;
    [key: string]: any;
  };
}
