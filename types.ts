import React from 'react';

export interface InspectionData {
  id?: string;
  tester: string;
  date: string; // ISO Date string YYYY-MM-DD
  time?: string; // HH:mm
  grade: string;
  lot: string;
  rating: number; // Roughness value (e.g., Ra)
  createdAt: number; // Timestamp
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}