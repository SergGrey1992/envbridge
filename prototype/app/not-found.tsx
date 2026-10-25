'use client';
import { value } from '../env';
export default function NotFound() { return <p id="missing">{value()}</p>; }
