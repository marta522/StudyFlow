import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function csrfProtection(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  if (
    ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
  ) {
    next();
    return;
  }

  const cookieToken = request.cookies.studyflow_csrf;
  const headerToken = request.get('X-CSRF-Token');
  if (!cookieToken || !headerToken) {
    response.status(403).json({
      statusCode: 403,
      message: 'Brak prawidłowego tokenu CSRF.',
    });
    return;
  }

  const cookieBytes = Buffer.from(cookieToken);
  const headerBytes = Buffer.from(headerToken);
  if (
    cookieBytes.length !== headerBytes.length ||
    !timingSafeEqual(cookieBytes, headerBytes)
  ) {
    response.status(403).json({
      statusCode: 403,
      message: 'Brak prawidłowego tokenu CSRF.',
    });
    return;
  }
  next();
}
