"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ConnectorElement, ConnectorDoc, ConnectorStyle } from "./types";

const DEFAULT_STROKE = "#5d4037";
const DEFAULT_STROKE_WIDTH = 2;

function parseTimestamp(raw: unknown): number {
  if (raw && typeof raw === "object" && "toMillis" in raw) {
    return (raw as Timestamp).toMillis();
  }
  if (typeof raw === "number") return raw;
  if (raw && typeof raw === "object" && "getTime" in raw) {
    return (raw as Date).getTime();
  }
  return Date.now();
}

export function usePersistedConnectors(boardId: string) {
  const [connectors, setConnectors] = useState<ConnectorElement[]>([]);

  useEffect(() => {
    const elementsRef = collection(db, "boards", boardId, "elements");
    const q = query(elementsRef, where("type", "==", "connector"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const result: ConnectorElement[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ConnectorDoc & {
            createdAt?: unknown;
            updatedAt?: unknown;
          };
          result.push({
            id: docSnap.id,
            type: "connector",
            fromId: data.fromId ?? "",
            toId: data.toId ?? "",
            fromType: data.fromType ?? "note",
            toType: data.toType ?? "note",
            style: data.style ?? "arrow",
            stroke: data.stroke ?? DEFAULT_STROKE,
            strokeWidth: data.strokeWidth ?? DEFAULT_STROKE_WIDTH,
            dashed: data.dashed ?? false,
            curved: data.curved ?? false,
            bidirectional: data.bidirectional ?? false,
            label: data.label ?? "",
            createdBy: data.createdBy ?? "",
            createdAt: parseTimestamp(data.createdAt),
            updatedAt: parseTimestamp(data.updatedAt),
          });
        });
        result.sort((a, b) => a.createdAt - b.createdAt);
        setConnectors(result);
      },
      (err) => {
        console.error("Firestore connectors subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [boardId]);

  return connectors;
}

export async function deleteConnector(
  boardId: string,
  connectorId: string
): Promise<void> {
  const elementsRef = collection(db, "boards", boardId, "elements");
  await deleteDoc(doc(elementsRef, connectorId));
}

export async function persistConnector(
  boardId: string,
  connector: ConnectorElement
): Promise<void> {
  const elementsRef = collection(db, "boards", boardId, "elements");
  await setDoc(doc(elementsRef, connector.id), {
    type: "connector",
    fromId: connector.fromId,
    toId: connector.toId,
    fromType: connector.fromType,
    toType: connector.toType,
    style: connector.style,
    stroke: connector.stroke ?? DEFAULT_STROKE,
    strokeWidth: connector.strokeWidth ?? DEFAULT_STROKE_WIDTH,
    dashed: connector.dashed ?? false,
    curved: connector.curved ?? false,
    bidirectional: connector.bidirectional ?? false,
    label: connector.label ?? "",
    createdBy: connector.createdBy,
    createdAt: connector.createdAt,
    updatedAt: connector.updatedAt,
  });
}

export function createDefaultConnector(
  fromId: string,
  toId: string,
  fromType: ConnectorElement["fromType"],
  toType: ConnectorElement["toType"],
  userId: string,
  style: ConnectorStyle = "arrow"
): ConnectorElement {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `connector-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  return {
    id,
    type: "connector",
    fromId,
    toId,
    fromType,
    toType,
    style,
    stroke: DEFAULT_STROKE,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
}
