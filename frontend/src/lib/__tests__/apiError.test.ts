import { AxiosError, AxiosHeaders } from 'axios';
import { apiErrorMessage, apiErrorStatus } from '../apiError';

function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  });
}

describe('apiErrorMessage', () => {
  it('returns the ProblemDetail detail', () => {
    expect(
      apiErrorMessage(httpError(409, { status: 409, detail: 'Email already registered' }), 'x')
    ).toBe('Email already registered');
  });

  it('falls back when the response has no detail', () => {
    expect(apiErrorMessage(httpError(500, {}), 'Try again')).toBe('Try again');
  });

  it('falls back for errors that did not come from axios', () => {
    expect(apiErrorMessage(new Error('boom'), 'Try again')).toBe('Try again');
  });
});

describe('apiErrorStatus', () => {
  it('returns the response status', () => {
    expect(apiErrorStatus(httpError(401, {}))).toBe(401);
  });

  it('is undefined for other errors', () => {
    expect(apiErrorStatus(new Error('boom'))).toBeUndefined();
  });
});
