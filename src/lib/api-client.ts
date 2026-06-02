import { API_BASE_URL } from "../config/env";

type ErrorBody = {
  message?: string;
  errors?: unknown;
};

export type ApiClientOptions = Omit<RequestInit, "headers"> & {
  token?: string | null;
  headers?: Record<string, string>;
  isFormData?: boolean;
};

export class ApiError extends Error {
  public readonly status: number;
  public readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const parseJson = (value: string) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const humanizeFieldName = (field: string) =>
  field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const extractValidationMessage = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const { errors } = payload as ErrorBody;

  if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
    return null;
  }

  for (const [field, messages] of Object.entries(errors)) {
    if (Array.isArray(messages)) {
      const message = messages.find((item): item is string => typeof item === "string" && item.trim().length > 0);

      if (message) {
        return `${humanizeFieldName(field)}: ${message}`;
      }
    }
  }

  return null;
};

export async function apiClient<TResponse>(path: string, options: ApiClientOptions = {}) {
  const { token, headers, isFormData = false, ...requestOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  });
  
  const rawResponseBody = await response.text();
  const responseBody = parseJson(rawResponseBody);

  if (!response.ok) {
    const message =
      extractValidationMessage(responseBody) ??
      (responseBody as ErrorBody | null)?.message ??
      `API request failed with status ${response.status}`;

    throw new ApiError(message, response.status, responseBody);
  }

  return responseBody as TResponse;
}

export const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};
