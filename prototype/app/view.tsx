'use client';
import { value } from '../env';
export default function View() { return <p id="client">{value()}</p>; }
