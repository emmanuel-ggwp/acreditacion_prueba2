import { POST } from '../route';
import { AuthService, authService } from '@/services/authService';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

jest.mock('@/services/authService');

const mockedAuthService = authService as jest.Mocked<typeof authService>;

describe('POST /api/auth/login', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return tokens on successful login', async () => {
    const requestBody = { email: 'test@example.com', password: 'password123' };
    const mockResponse = {
      accessToken: 'fake-access-token',
      refreshToken: 'fake-refresh-token',
      user: { 
        id: '1', 
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN' as const 
      },
    };
    mockedAuthService.login.mockResolvedValue(mockResponse);

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toEqual('fake-access-token');
    expect(body.data.user.email).toEqual('test@example.com');
    expect(body.data.refreshToken).toEqual('fake-refresh-token');
  });

  it('should return 401 for invalid credentials', async () => {
    const requestBody = { email: 'wrong@example.com', password: 'wrongpassword' };
    mockedAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

    const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ success: false, error: 'Invalid credentials' });
  });

  it('should return 400 for invalid input', async () => {
    const requestBody = { email: 'not-an-email', password: 'short' }; // Invalid data
    
    const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.length).toBeGreaterThan(0);
  });
});
