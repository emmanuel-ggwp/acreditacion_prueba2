import { POST } from '../route';
import { authService } from '@/services/authService';
import { verifyAccessToken } from '@/lib/jwt';

jest.mock('@/services/authService');
jest.mock('@/lib/jwt');

const mockedAuthService = authService as jest.Mocked<typeof authService>;
const mockedVerifyAccessToken = verifyAccessToken as jest.Mock;

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a user successfully as an ADMIN', async () => {
    mockedVerifyAccessToken.mockReturnValue({ id: '1', role: 'ADMIN' });
    const requestBody = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
      role: 'ACREDITADOR',
    };
    const mockResponse = { id: '2', ...requestBody };
    mockedAuthService.register.mockResolvedValue(mockResponse as any);

    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
    });

    const response = await (POST as any)(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockResponse);
  });

  it('should return 403 if user is not an ADMIN', async () => {
    mockedVerifyAccessToken.mockReturnValue({ id: '1', role: 'ACREDITADOR' });
    const requestBody = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        role: 'ACREDITADOR',
      };

    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
    });

    const response = await (POST as any)(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
  });

  it('should return 409 if email is already in use', async () => {
    mockedVerifyAccessToken.mockReturnValue({ id: '1', role: 'ADMIN' });
    const requestBody = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'Existing',
        lastName: 'User',
        role: 'ACREDITADOR',
      };
    mockedAuthService.register.mockRejectedValue(new Error('Email already in use'));

    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
    });

    const response = await (POST as any)(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ success: false, error: 'Email already in use' });
  });

  it('should return 400 for invalid data', async () => {
    mockedVerifyAccessToken.mockReturnValue({ id: '1', role: 'ADMIN' });
    const requestBody = { email: 'not-an-email' }; // Missing fields

    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
    });

    const response = await (POST as any)(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(Array.isArray(body.error)).toBe(true);
    expect(body.error.length).toBeGreaterThan(0);
  });
});
