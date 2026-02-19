/**
 * Connectors feature - lines/arrows between notes and shapes
 */

export type ConnectorStyle = "line" | "arrow";

export type ConnectorEndpointType = "note" | "shape";

export interface ConnectorElement {
  id: string;
  type: "connector";
  fromId: string;
  toId: string;
  fromType: ConnectorEndpointType;
  toType: ConnectorEndpointType;
  style: ConnectorStyle;
  stroke?: string;
  strokeWidth?: number;
  label?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConnectorDoc {
  type: "connector";
  fromId: string;
  toId: string;
  fromType: ConnectorEndpointType;
  toType: ConnectorEndpointType;
  style: ConnectorStyle;
  stroke?: string;
  strokeWidth?: number;
  label?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}
