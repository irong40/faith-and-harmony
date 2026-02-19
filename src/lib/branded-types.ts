// Branded types for type-safe ID handling
// Usage: function getUser(id: UserId) prevents passing a MissionId where UserId expected

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type MissionId = Brand<string, 'MissionId'>;
export type AircraftId = Brand<string, 'AircraftId'>;
export type BatteryId = Brand<string, 'BatteryId'>;
export type ControllerId = Brand<string, 'ControllerId'>;
export type WeatherLogId = Brand<string, 'WeatherLogId'>;
export type AuthorizationId = Brand<string, 'AuthorizationId'>;

// Helper to cast raw strings into branded types at trust boundaries
export function asUserId(id: string): UserId { return id as UserId; }
export function asMissionId(id: string): MissionId { return id as MissionId; }
export function asAircraftId(id: string): AircraftId { return id as AircraftId; }
export function asBatteryId(id: string): BatteryId { return id as BatteryId; }
export function asControllerId(id: string): ControllerId { return id as ControllerId; }
export function asWeatherLogId(id: string): WeatherLogId { return id as WeatherLogId; }
export function asAuthorizationId(id: string): AuthorizationId { return id as AuthorizationId; }
