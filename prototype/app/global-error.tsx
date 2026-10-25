'use client';
import { value } from '../env';
export default function GlobalError() { return <html><body><p id="global">{value()}</p></body></html>; }
