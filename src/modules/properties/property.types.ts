import type { BaseEntity } from "../../shared/types.js";

export const PropertyType = {
  SingleFamily: "single_family",
  Apartment: "apartment",
  MultiUnit: "multi_unit",
  Townhouse: "townhouse",
  Commercial: "commercial",
  Other: "other",
} as const;

export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export const PropertyStatus = {
  Active: "active",
  Archived: "archived",
} as const;

export type PropertyStatus = (typeof PropertyStatus)[keyof typeof PropertyStatus];

export interface Property extends BaseEntity {
  readonly name: string;
  readonly type: PropertyType;
  readonly address: string;
  readonly city: string;
  readonly status: PropertyStatus;
  readonly description: string;
  readonly notes: string;
}

export type PropertyCreate = Omit<Property, keyof BaseEntity>;
export type PropertyUpdate = Partial<PropertyCreate>;
