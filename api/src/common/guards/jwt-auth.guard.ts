import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AuthenticatedRequest,
  CurrentUserPayload,
} from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization Bearer token',
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync<CurrentUserPayload>(
        token,
      );

      if (!payload || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
        throw new UnauthorizedException('Invalid token payload');
      }

      request.user = {
        sub: payload.sub,
        email: payload.email,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  private extractTokenFromHeader(
    request: AuthenticatedRequest,
  ): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return undefined;
    }

    const [type, token] = authHeader.trim().split(/\s+/);
    return type === 'Bearer' && token ? token : undefined;
  }
}
