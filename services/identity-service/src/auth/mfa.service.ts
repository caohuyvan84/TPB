import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class MfaService {
  generateSecret(username: string): { secret: string; qrCode: string } {
    const secret = speakeasy.generateSecret({
      name: `TPB CRM (${username})`,
      issuer: 'TPBank',
      length: 32,
    });

    return {
      secret: secret.base32 || '',
      qrCode: secret.otpauth_url || '',
    };
  }

  async generateQRCode(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after
    });
  }
}
