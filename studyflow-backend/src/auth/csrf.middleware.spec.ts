import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { csrfProtection } from './csrf.middleware';

describe('csrfProtection', () => {
  function makeRequest({
    method = 'POST',
    csrfCookie,
    csrfHeader,
  }: {
    method?: string;
    csrfCookie?: string;
    csrfHeader?: string;
  } = {}) {
    return {
      method,
      cookies: { studyflow_csrf: csrfCookie },
      get: () => csrfHeader,
    } as unknown as Request;
  }

  function makeResponse() {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    return response as unknown as Response & typeof response;
  }

  it('rejects unsafe requests without a matching CSRF token', () => {
    const request = makeRequest({ csrfCookie: 'cookie-token' });
    const response = makeResponse();
    const next = jest.fn() as unknown as NextFunction;

    csrfProtection(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('also protects unauthenticated state-changing requests', () => {
    const request = makeRequest({
      csrfCookie: undefined,
      csrfHeader: undefined,
    });
    const response = makeResponse();
    const next = jest.fn() as unknown as NextFunction;

    csrfProtection(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects same-character-length tokens with different UTF-8 byte lengths', () => {
    const request = makeRequest({
      csrfCookie: 'a'.repeat(64),
      csrfHeader: 'é'.repeat(32),
    });
    const response = makeResponse();
    const next = jest.fn() as unknown as NextFunction;

    csrfProtection(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows requests with matching tokens and does not require CSRF on safe requests', () => {
    const next = jest.fn() as unknown as NextFunction;

    csrfProtection(
      makeRequest({
        csrfCookie: 'same-token',
        csrfHeader: 'same-token',
      }),
      makeResponse(),
      next,
    );
    csrfProtection(
      makeRequest({ method: 'GET', csrfCookie: undefined, csrfHeader: undefined }),
      makeResponse(),
      next,
    );

    expect(next).toHaveBeenCalledTimes(2);
  });
});
